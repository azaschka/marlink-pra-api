import * as fs from 'fs';
import * as path from 'path';
import { COLLECTION_CONFIG } from '../config/collection.config';
import {
    checkCredentialValues,
    checkFileNames,
    checkRenderedRequests,
    checkVariables,
    readNativeRequests,
    readV21Requests,
    validateV21Schema,
} from './artifact-checks';
import { buildCollectionModel } from './collection-builder';
import { DtoAnalyzer } from './dto-analyzer';
import { buildManifest, CoverageManifest, renderSummary } from './manifest';
import { ExtractionResult, Issue, Operation } from './model';
import { OperationBuilder } from './operation-builder';
import { IdFactory } from './render-common';
import { extractRoutes } from './route-extractor';
import { SourceIndex } from './source-index';
import { renderNativeCollection } from './v3-writer';
import { readWorkspaceBinding } from './workspace-binding';
import { renderEnvironmentTemplate, renderV21Collection, stringifyJson } from './v21-exporter';

/**
 * Produces every artifact in memory and validates it. Nothing is written here; see `sync.ts`.
 */

export interface GeneratorOptions {
    repositoryRoot: string;
    /** Release version override; defaults to the version in package.json. */
    releaseVersion?: string;
    /** Root Nest module; defaults to `src/app.module` (loaded lazily, without bootstrapping the app). */
    rootModule?: unknown;
    config?: typeof COLLECTION_CONFIG;
}

export interface GeneratedArtifacts {
    version: string;
    collectionName: string;
    /** Every managed output, keyed by path relative to the repository root. */
    files: Map<string, string>;
    /** Native collection files, keyed by path relative to the collection directory. */
    nativeFiles: Map<string, string>;
    customerExportText: string;
    manifest: CoverageManifest;
    operations: Operation[];
    extraction: ExtractionResult;
    issues: Issue[];
}

export const SCHEMA_DIRECTORY = path.join(__dirname, '..', 'schemas');

function readPackageVersion(repositoryRoot: string): string {
    const packageJson = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8')) as {
        version?: string;
    };

    if (!packageJson.version) {
        throw new Error('package.json has no version.');
    }

    return packageJson.version;
}

function bootstrapIssues(sourceIndex: SourceIndex, config: typeof COLLECTION_CONFIG): Issue[] {
    const facts = sourceIndex.readMainBootstrap();
    const issues: Issue[] = [];

    if (facts.setGlobalPrefixCalls.length > 0 && config.urlComposition.globalPrefix === '') {
        issues.push({
            severity: 'error',
            code: 'URL_COMPOSITION_CHANGED',
            message: `src/main.ts sets a global prefix (${facts.setGlobalPrefixCalls.join('; ')}); review urlComposition in the generator configuration.`,
        });
    }

    if (facts.enableVersioningCalls.length > 0 && !config.urlComposition.uriVersioning) {
        issues.push({
            severity: 'error',
            code: 'URL_COMPOSITION_CHANGED',
            message: `src/main.ts enables versioning (${facts.enableVersioningCalls.join('; ')}); review urlComposition in the generator configuration.`,
        });
    }

    if (facts.queryParserSettings.length > 0) {
        issues.push({
            severity: 'error',
            code: 'QUERY_PARSER_CHANGED',
            message: `src/main.ts changes the query parser (${facts.queryParserSettings.join('; ')}); array query serialisation must be reviewed.`,
        });
    }

    for (const server of facts.openApiServers) {
        if (!config.knownOpenApiServers.includes(server)) {
            issues.push({
                severity: 'warning',
                code: 'UNKNOWN_OPENAPI_SERVER',
                message: `src/main.ts declares the OpenAPI server ${server}; explain it in the collection overview.`,
            });
        }
    }

    return issues;
}

export async function loadAppModule(repositoryRoot: string): Promise<unknown> {
    const modulePath = path.join(repositoryRoot, 'src', 'app.module');
    const loaded = (await import(modulePath)) as { AppModule: unknown };

    return loaded.AppModule;
}

export async function generateArtifacts(options: GeneratorOptions): Promise<GeneratedArtifacts> {
    const config = options.config ?? COLLECTION_CONFIG;
    const root = options.repositoryRoot;
    const version = options.releaseVersion ?? readPackageVersion(root);
    const sourceIndex = new SourceIndex(root);
    const issues: Issue[] = bootstrapIssues(sourceIndex, config);
    const rootModule = options.rootModule ?? (await loadAppModule(root));
    const extraction = await extractRoutes(rootModule);
    const builder = new OperationBuilder({ sourceIndex, analyzer: new DtoAnalyzer(sourceIndex), config });
    const built = await builder.build(extraction);
    const operations = [...built.operations];
    const ids = new IdFactory(config.idNamespace);

    issues.push(...built.issues);

    const internalModel = buildCollectionModel(operations, version, built.pathVariables, 'internal', config);
    const customerOperations = operations.filter((operation) => operation.customerExport.status === 'included');
    const customerModel = buildCollectionModel(customerOperations, version, built.pathVariables, 'customer', config);
    const binding = readWorkspaceBinding(
        root,
        config.paths.workspaceBinding,
        config.paths.nativeCollectionDir,
        config.paths.legacyPaths,
    );

    issues.push(...binding.issues);

    const nativeFiles = renderNativeCollection(internalModel, ids, binding.cloudCollectionId);
    const internalJson = renderV21Collection(internalModel, ids, ids.id('collection:internal'));
    const customerJson = renderV21Collection(customerModel, ids, ids.id('collection:customer'));
    const environment = renderEnvironmentTemplate(internalModel, ids);
    const internalText = stringifyJson(internalJson);
    const customerText = stringifyJson(customerJson);

    // Independent checks of the rendered artifacts.
    const allKeys = new Set(operations.map((operation) => operation.key));
    const customerKeys = new Set(customerOperations.map((operation) => operation.key));
    const definedInternal = new Set(internalModel.variables.map((variable) => variable.key));
    const definedCustomer = new Set(customerModel.variables.map((variable) => variable.key));
    const variableDescriptions = new Map(
        internalModel.variables.map((variable) => [variable.key, variable.description]),
    );

    issues.push(
        ...checkRenderedRequests(readNativeRequests(nativeFiles), {
            label: 'native collection',
            operations,
            variables: variableDescriptions,
            expectedKeys: allKeys,
        }),
        ...checkRenderedRequests(readV21Requests(internalJson), {
            label: 'internal export',
            operations,
            variables: variableDescriptions,
            expectedKeys: allKeys,
        }),
        ...checkRenderedRequests(readV21Requests(customerJson), {
            label: 'customer export',
            operations,
            variables: variableDescriptions,
            expectedKeys: customerKeys,
        }),
        ...checkVariables('native collection', [...nativeFiles.values()].join('\n'), definedInternal),
        ...checkVariables('internal export', internalText, definedInternal),
        ...checkVariables('customer export', customerText, definedCustomer),
        ...checkCredentialValues('internal model', internalModel.variables),
        ...checkCredentialValues('customer model', customerModel.variables),
        ...checkCredentialValues('environment template', environment.values as Array<{ key: string; value: unknown }>),
        ...checkFileNames(nativeFiles.keys()),
        ...validateV21Schema('internal export', internalJson, SCHEMA_DIRECTORY),
        ...validateV21Schema('customer export', customerJson, SCHEMA_DIRECTORY),
    );

    for (const operation of customerOperations) {
        if (operation.auth.schemes.includes('apiKey')) {
            issues.push({
                severity: 'error',
                code: 'INTERNAL_OPERATION_EXPORTED',
                message: `${operation.key} uses X-API-Key but is part of the customer export.`,
                operation: operation.key,
            });
        }
    }

    const requestFiles = new Map<string, string>();

    for (const file of nativeFiles.keys()) {
        if (file.endsWith('.request.yaml')) {
            const operation = operations.find(
                (entry) =>
                    file.endsWith(`/${entry.fileStem}.request.yaml`) &&
                    file.startsWith(`${entry.domain}/${entry.controllerName}/`),
            );

            if (operation) {
                requestFiles.set(operation.key, `${config.paths.nativeCollectionDir}/${file}`);
            }
        }
    }

    const controllerFiles = new Map(
        extraction.controllers.map((controller) => [
            controller.controllerName,
            sourceIndex.findClass(controller.controllerName)?.file,
        ]),
    );
    const manifest = buildManifest(
        internalModel.name,
        version,
        extraction,
        operations,
        requestFiles,
        issues,
        controllerFiles,
        config.controllersWithoutRoutes,
    );
    const files = new Map<string, string>();

    for (const [file, content] of nativeFiles) {
        files.set(`${config.paths.nativeCollectionDir}/${file}`, content);
    }

    files.set(config.paths.internalExport, internalText);
    files.set(config.paths.customerExport, customerText);
    files.set(config.paths.environmentTemplate, stringifyJson(environment));
    files.set(config.paths.coverageManifest, stringifyJson(manifest));
    files.set(config.paths.coverageSummary, renderSummary(manifest));

    return {
        version,
        collectionName: internalModel.name,
        files,
        nativeFiles,
        customerExportText: customerText,
        manifest,
        operations,
        extraction,
        issues,
    };
}

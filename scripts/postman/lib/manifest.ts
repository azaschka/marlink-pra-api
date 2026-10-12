import { ExtractionResult, Issue, Operation } from './model';

/**
 * Machine-readable coverage manifest and its human summary. Both are deterministic: no timestamps, sorted
 * content, relative paths only. Changes between two generations are visible in the Git diff of the manifest
 * and are printed by the CLI.
 */

export interface ManifestOperation {
    key: string;
    method: string;
    path: string;
    domain: string;
    module: string;
    controller: string;
    handler: string;
    sourceFile?: string;
    requestFile: string;
    authentication: string[];
    swaggerExcluded: boolean;
    customerExport: { status: string; reason: string };
    body?: { dto: string; validationEnforced: boolean; nonEmptyRequired: boolean; exampleSource: string };
    query?: string;
    contractNotes: string[];
}

export interface CoverageManifest {
    manifestVersion: 1;
    collection: { name: string; version: string };
    summary: {
        registeredControllers: number;
        controllersWithRoutes: number;
        registeredRoutes: number;
        operations: number;
        swaggerExcludedOperations: number;
        customerExport: { included: number; excludedByPolicy: number; pendingDecision: number };
        warnings: number;
    };
    controllers: Array<{ module: string; controller: string; sourceFile?: string; routes: number; note?: string }>;
    operations: ManifestOperation[];
    warnings: Array<{ code: string; message: string; operation?: string }>;
}

export function buildManifest(
    name: string,
    version: string,
    extraction: ExtractionResult,
    operations: Operation[],
    requestFiles: Map<string, string>,
    issues: Issue[],
    controllerFiles: Map<string, string | undefined>,
    controllerNotes: Record<string, string>,
): CoverageManifest {
    const warnings = issues
        .filter((issue) => issue.severity === 'warning')
        .map((issue) => ({ code: issue.code, message: issue.message, operation: issue.operation }))
        .sort((a, b) => `${a.code}${a.message}`.localeCompare(`${b.code}${b.message}`));
    const count = (status: string) =>
        operations.filter((operation) => operation.customerExport.status === status).length;

    return {
        manifestVersion: 1,
        collection: { name, version },
        summary: {
            registeredControllers: extraction.controllers.length,
            controllersWithRoutes: extraction.controllers.filter((controller) => controller.routeCount > 0).length,
            registeredRoutes: extraction.routes.length,
            operations: operations.length,
            swaggerExcludedOperations: operations.filter((operation) => operation.swaggerExcluded).length,
            customerExport: {
                included: count('included'),
                excludedByPolicy: count('excluded-policy'),
                pendingDecision: count('pending-decision'),
            },
            warnings: warnings.length,
        },
        controllers: extraction.controllers.map((controller) => ({
            module: controller.moduleName,
            controller: controller.controllerName,
            sourceFile: controllerFiles.get(controller.controllerName),
            routes: controller.routeCount,
            note: controllerNotes[controller.controllerName],
        })),
        operations: operations.map((operation) => ({
            key: operation.key,
            method: operation.method,
            path: operation.path,
            domain: operation.domain,
            module: operation.moduleName,
            controller: operation.controllerName,
            handler: operation.handlerName,
            sourceFile: operation.sourceFile,
            requestFile: requestFiles.get(operation.key) ?? '',
            authentication: operation.auth.schemes,
            swaggerExcluded: operation.swaggerExcluded,
            customerExport: operation.customerExport,
            body: operation.body
                ? {
                      dto: operation.body.dtoName,
                      validationEnforced: operation.body.validationEnforced,
                      nonEmptyRequired: operation.body.nonEmptyRequired,
                      exampleSource: operation.body.exampleSource,
                  }
                : undefined,
            query: operation.query?.className,
            contractNotes: operation.discrepancies,
        })),
        warnings,
    };
}

export interface ManifestDiff {
    added: string[];
    removed: string[];
    changed: string[];
}

/** Operation-level differences between the previous manifest on disk and the new one. */
export function diffManifests(previous: CoverageManifest | undefined, next: CoverageManifest): ManifestDiff {
    const before = new Map((previous?.operations ?? []).map((operation) => [operation.key, JSON.stringify(operation)]));
    const after = new Map(next.operations.map((operation) => [operation.key, JSON.stringify(operation)]));

    return {
        added: [...after.keys()].filter((key) => !before.has(key)).sort(),
        removed: [...before.keys()].filter((key) => !after.has(key)).sort(),
        changed: [...after.keys()].filter((key) => before.has(key) && before.get(key) !== after.get(key)).sort(),
    };
}

function table(header: string[], rows: string[][]): string[] {
    return [
        `| ${header.join(' | ')} |`,
        `|${header.map(() => '---').join('|')}|`,
        ...rows.map((row) => `| ${row.map((cell) => cell.replace(/\|/g, '\\|')).join(' | ')} |`),
    ];
}

export function renderSummary(manifest: CoverageManifest): string {
    const s = manifest.summary;
    const excluded = manifest.operations.filter((operation) => operation.customerExport.status !== 'included');
    const notes = manifest.operations.filter((operation) => operation.contractNotes.length > 0);
    const lines = [
        `# Coverage of ${manifest.collection.name}`,
        '',
        'Generated by `npm run postman:generate`. Do not edit by hand. Matching is by HTTP method and normalised path against the routes registered in the Nest module graph.',
        '',
        '## Totals',
        '',
        ...table(
            ['Item', 'Count'],
            [
                ['Registered controllers', String(s.registeredControllers)],
                ['Controllers with routes', String(s.controllersWithRoutes)],
                ['Registered routes', String(s.registeredRoutes)],
                ['Operations in the internal collection', String(s.operations)],
                ['Operations hidden from Swagger', String(s.swaggerExcludedOperations)],
                ['Customer export: included', String(s.customerExport.included)],
                ['Customer export: excluded by policy', String(s.customerExport.excludedByPolicy)],
                ['Customer export: pending decision', String(s.customerExport.pendingDecision)],
                ['Warnings', String(s.warnings)],
            ],
        ),
        '',
        '## Controllers',
        '',
        ...table(
            ['Module', 'Controller', 'Routes', 'Source'],
            manifest.controllers.map((controller) => [
                controller.module,
                controller.controller,
                String(controller.routes),
                `${controller.sourceFile ?? ''}${controller.note ? ` (${controller.note})` : ''}`,
            ]),
        ),
        '',
        '## Operations not in the customer export',
        '',
        ...table(
            ['Operation', 'Status', 'Reason'],
            excluded.map((operation) => [
                `\`${operation.key}\``,
                operation.customerExport.status,
                operation.customerExport.reason,
            ]),
        ),
        '',
        '## Contract notes',
        '',
        'Differences between effective behaviour in code and Swagger metadata, unauthenticated routes and unenforced validation. They are documented, not changed.',
        '',
        ...notes.flatMap((operation) => [
            `- \`${operation.key}\``,
            ...operation.contractNotes.map((note) => `  - ${note}`),
        ]),
        '',
        '## Warnings',
        '',
        ...(manifest.warnings.length
            ? manifest.warnings.map((warning) => `- ${warning.code}: ${warning.message}`)
            : ['None.']),
        '',
    ];

    return lines.join('\n');
}

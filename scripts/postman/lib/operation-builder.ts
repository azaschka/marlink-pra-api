import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { COLLECTION_CONFIG } from '../config/collection.config';
import {
    ComponentRule,
    GUARD_RULES,
    HeaderRead,
    INTERCEPTOR_RULES,
    PARAM_DECORATOR_RULES,
    ParamDecoratorRule,
    PIPE_RULES,
} from '../config/components.config';
import {
    APPROVED_CUSTOMER_OPERATIONS,
    EXCLUDED_CUSTOMER_CONTROLLERS,
    EXCLUDED_CUSTOMER_DOMAINS,
    EXCLUDED_CUSTOMER_OPERATIONS,
    INTERNAL_PATH_PREFIXES,
} from '../config/customer-export.config';
import { FIELD_EXAMPLES, REQUEST_OVERRIDES, RequestOverride } from '../config/request-overrides';
import { DtoAnalyzer } from './dto-analyzer';
import { buildExample, buildFieldExample, childFields, queryValueString } from './example-builder';
import {
    AuthRequirement,
    AuthScheme,
    BodyModel,
    ClassRef,
    CustomerExportDecision,
    DtoDoc,
    ExtractedComponent,
    ExtractedParameter,
    ExtractedRoute,
    ExtractionResult,
    FieldDoc,
    InputParam,
    Issue,
    Operation,
    ResponseDoc,
} from './model';
import { hasValidationPipe, runnablePipes, runPipes } from './pipe-runner';
import { SourceIndex } from './source-index';
import { describeOperation } from './description-writer';

/**
 * Turns extracted routes into protocol-neutral operations: inputs, authentication, examples, export
 * decision and documentation. All contract facts come from code; configuration only adds what code cannot
 * express (folder names, variable names, explanations, approved customer operations).
 */

export interface BuildContext {
    sourceIndex: SourceIndex;
    analyzer: DtoAnalyzer;
    config?: typeof COLLECTION_CONFIG;
    overrides?: Record<string, RequestOverride>;
    fieldExamples?: Record<string, unknown>;
    approvedCustomerOperations?: string[];
    excludedCustomerOperations?: Record<string, string>;
    excludedCustomerDomains?: Record<string, string>;
    excludedCustomerControllers?: Record<string, string>;
    internalPathPrefixes?: string[];
    guardRules?: Record<string, ComponentRule>;
    interceptorRules?: Record<string, ComponentRule>;
    pipeRules?: Record<string, ComponentRule>;
    paramDecoratorRules?: ParamDecoratorRule[];
}

export interface BuildResult {
    operations: Operation[];
    issues: Issue[];
    pathVariables: Map<string, string>;
}

const AUTH_HEADERS = new Set(['x-access-key', 'x-api-key', 'authorization']);

/** `GET /sites/:id` and `GET /sites/:siteId` address the same route; parameters are normalised for matching. */
export function normalizedRouteKey(method: string, path: string): string {
    return `${method.toUpperCase()} ${path.replace(/:[A-Za-z0-9_]+/g, '{}').replace(/\{\{[A-Za-z0-9_]+\}\}/g, '{}')}`;
}

export function operationKey(method: string, path: string): string {
    return `${method} ${path}`;
}

function bodyClassOf(route: ExtractedRoute): ClassRef | undefined {
    return route.params.find((param) => param.source === 'body')?.metatype;
}

function sentence(text: string): string {
    const trimmed = text.trim();

    return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function camelCase(text: string): string {
    return text.replace(/[-_\s]+([a-zA-Z0-9])/g, (_match, letter: string) => letter.toUpperCase());
}

function singular(segment: string): string {
    if (segment.endsWith('ies')) {
        return `${segment.slice(0, -3)}y`;
    }

    if (segment.endsWith('ss')) {
        return segment;
    }

    if (segment.endsWith('s')) {
        return segment.slice(0, -1);
    }

    return segment;
}

function humanize(text: string): string {
    const words = text
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[-_]+/g, ' ')
        .trim()
        .toLowerCase();

    return words.charAt(0).toUpperCase() + words.slice(1);
}

export function pathParameterNames(path: string): string[] {
    return [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1] as string);
}

/** Collection variable name for a path parameter (domain-specific instead of a generic `id`). */
export function pathVariableName(path: string, parameter: string, overrides: Record<string, string>): string {
    const segments = path.split('/');
    const index = segments.indexOf(`:${parameter}`);
    const prefix = segments.slice(0, index + 1).join('/');
    const override = overrides[prefix];

    if (override) {
        return override;
    }

    if (parameter !== 'id') {
        return parameter;
    }

    const previous = segments[index - 1] ?? 'resource';

    return `${camelCase(singular(previous))}Id`;
}

function paramTypeName(metatype: ClassRef | undefined): 'string' | 'integer' | 'boolean' {
    if (metatype === Number) {
        return 'integer';
    }

    if (metatype === Boolean) {
        return 'boolean';
    }

    return 'string';
}

function labelFromHandler(handlerName: string): string {
    return humanize(handlerName);
}

function fileStem(method: string, path: string): string {
    const body = path
        .replace(/^\//, '')
        .split('/')
        .filter(Boolean)
        .map((segment) => segment.replace(/^:(.+)$/, '{$1}'))
        .join(' ');

    return `${method} ${body || 'root'}`;
}

class ParamDecoratorResolver {
    private readonly byFactory = new Map<unknown, ParamDecoratorRule>();

    constructor(rules: ParamDecoratorRule[]) {
        for (const rule of rules) {
            this.byFactory.set(this.probeFactory(rule), rule);
        }
    }

    public resolve(factory: unknown): ParamDecoratorRule | undefined {
        return this.byFactory.get(factory);
    }

    /** Applies the decorator to a throwaway class and reads the factory Nest stored for it. */
    private probeFactory(rule: ParamDecoratorRule): unknown {
        class Probe {
            public handler(): void {
                return;
            }
        }

        rule.decorator()(Probe.prototype, 'handler', 0);

        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe, 'handler') as Record<
            string,
            { factory?: unknown }
        >;

        return Object.values(metadata)[0]?.factory;
    }
}

interface HeaderAccumulator {
    name: string;
    required: boolean;
    type: string;
    descriptions: string[];
    origins: string[];
}

export class OperationBuilder {
    private readonly config: typeof COLLECTION_CONFIG;
    private readonly overrides: Record<string, RequestOverride>;
    private readonly fieldExamples: Record<string, unknown>;
    private readonly approved: Set<string>;
    private readonly excluded: Record<string, string>;
    private readonly excludedDomains: Record<string, string>;
    private readonly excludedControllers: Record<string, string>;
    private readonly internalPrefixes: string[];
    private readonly guardRules: Record<string, ComponentRule>;
    private readonly interceptorRules: Record<string, ComponentRule>;
    private readonly pipeRules: Record<string, ComponentRule>;
    private readonly paramResolver: ParamDecoratorResolver;
    private readonly issues: Issue[] = [];
    private readonly pathVariables = new Map<string, string>();

    constructor(private readonly context: BuildContext) {
        this.config = context.config ?? COLLECTION_CONFIG;
        this.overrides = context.overrides ?? REQUEST_OVERRIDES;
        this.fieldExamples = context.fieldExamples ?? FIELD_EXAMPLES;
        this.approved = new Set(context.approvedCustomerOperations ?? APPROVED_CUSTOMER_OPERATIONS);
        this.excluded = context.excludedCustomerOperations ?? EXCLUDED_CUSTOMER_OPERATIONS;
        this.excludedDomains = context.excludedCustomerDomains ?? EXCLUDED_CUSTOMER_DOMAINS;
        this.excludedControllers = context.excludedCustomerControllers ?? EXCLUDED_CUSTOMER_CONTROLLERS;
        this.internalPrefixes = context.internalPathPrefixes ?? INTERNAL_PATH_PREFIXES;
        this.guardRules = context.guardRules ?? GUARD_RULES;
        this.interceptorRules = context.interceptorRules ?? INTERCEPTOR_RULES;
        this.pipeRules = context.pipeRules ?? PIPE_RULES;
        this.paramResolver = new ParamDecoratorResolver(context.paramDecoratorRules ?? PARAM_DECORATOR_RULES);
    }

    public async build(extraction: ExtractionResult): Promise<BuildResult> {
        this.checkControllers(extraction);
        this.checkDuplicates(extraction.routes);
        this.checkShadowing(extraction.routes);

        const operations: Operation[] = [];

        for (const route of extraction.routes) {
            operations.push(await this.buildOperation(route));
        }

        this.checkOverrideKeys(operations);
        this.checkFieldExampleKeys(operations);
        this.checkCustomerExportKeys(operations);

        return { operations, issues: this.issues, pathVariables: this.pathVariables };
    }

    private issue(severity: Issue['severity'], code: string, message: string, operation?: string): void {
        this.issues.push({ severity, code, message, operation });
    }

    private checkControllers(extraction: ExtractionResult): void {
        const configured = new Set(this.config.domains.flatMap((domain) => domain.controllers));

        for (const controller of extraction.controllers) {
            const withoutRoutes = this.config.controllersWithoutRoutes[controller.controllerName];

            if (controller.routeCount === 0 && !withoutRoutes) {
                this.issue(
                    'error',
                    'CONTROLLER_WITHOUT_ROUTES',
                    `${controller.controllerName} is registered but declares no route; explain it in controllersWithoutRoutes.`,
                );
            }

            if (controller.routeCount > 0 && !configured.has(controller.controllerName)) {
                this.issue(
                    'warning',
                    'CONTROLLER_WITHOUT_DOMAIN',
                    `${controller.controllerName} is not assigned to a domain folder; it is placed under "Unassigned".`,
                );
            }
        }

        const registered = new Set(extraction.controllers.map((controller) => controller.controllerName));

        for (const name of configured) {
            if (!registered.has(name)) {
                this.issue(
                    'error',
                    'CONFIGURED_CONTROLLER_NOT_REGISTERED',
                    `${name} is listed in a domain folder but not registered in any module.`,
                );
            }
        }
    }

    private checkDuplicates(routes: ExtractedRoute[]): void {
        const seen = new Map<string, ExtractedRoute>();

        for (const route of routes) {
            const key = normalizedRouteKey(route.method, route.path);
            const previous = seen.get(key);

            if (previous) {
                this.issue(
                    'error',
                    'DUPLICATE_ROUTE',
                    `${route.method} ${route.path} (${route.controllerName}.${route.handlerName}) duplicates ${previous.method} ${previous.path} (${previous.controllerName}.${previous.handlerName}).`,
                    operationKey(route.method, route.path),
                );
            } else {
                seen.set(key, route);
            }
        }
    }

    /** A parametric route registered earlier catches requests meant for a later static route. */
    private checkShadowing(routes: ExtractedRoute[]): void {
        for (const later of routes) {
            for (const earlier of routes) {
                if (earlier.registrationIndex >= later.registrationIndex || earlier.method !== later.method) {
                    continue;
                }

                const pattern = new RegExp(
                    `^${earlier.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:[A-Za-z0-9_]+/g, '[^/]+')}$`,
                );

                if (earlier.path !== later.path && pattern.test(later.path)) {
                    this.issue(
                        'warning',
                        'SHADOWED_ROUTE',
                        `${later.method} ${later.path} is registered after ${earlier.method} ${earlier.path}, which matches it first.`,
                        operationKey(later.method, later.path),
                    );
                }
            }
        }
    }

    private checkOverrideKeys(operations: Operation[]): void {
        const keys = new Set(operations.map((operation) => operation.key));

        for (const key of Object.keys(this.overrides)) {
            if (!keys.has(key)) {
                this.issue('error', 'ORPHAN_OVERRIDE', `Request override "${key}" does not match a registered route.`);
            }
        }

        for (const key of [
            ...Object.keys(this.config.requestObjectUsages),
            ...Object.keys(this.config.downloadResponses),
            ...Object.keys(this.config.passthroughResponses),
        ]) {
            if (!keys.has(key)) {
                this.issue(
                    'error',
                    'ORPHAN_CONFIG_ENTRY',
                    `Configuration entry "${key}" does not match a registered route.`,
                );
            }
        }
    }

    private checkFieldExampleKeys(operations: Operation[]): void {
        const known = new Set(
            operations.flatMap((operation) =>
                [...(operation.body?.fields ?? []), ...(operation.query?.fields ?? [])].map(
                    (field) => `${field.ownerClass}.${field.name}`,
                ),
            ),
        );

        for (const key of Object.keys(this.fieldExamples)) {
            if (!known.has(key)) {
                this.issue(
                    'error',
                    'ORPHAN_FIELD_EXAMPLE',
                    `Field example "${key}" does not match a property of a request DTO.`,
                );
            }
        }
    }

    private checkCustomerExportKeys(operations: Operation[]): void {
        const keys = new Set(operations.map((operation) => operation.key));

        const domains = new Set(operations.map((operation) => operation.domain));
        const controllers = new Set(operations.map((operation) => operation.controllerName));

        for (const key of [...this.approved, ...Object.keys(this.excluded)]) {
            if (!keys.has(key)) {
                this.issue(
                    'error',
                    'ORPHAN_EXPORT_DECISION',
                    `Customer export entry "${key}" does not match a registered route.`,
                );
            }
        }

        for (const domain of Object.keys(this.excludedDomains).filter((name) => !domains.has(name))) {
            this.issue('error', 'ORPHAN_EXPORT_DECISION', `Excluded folder "${domain}" does not exist.`);
        }

        for (const controller of Object.keys(this.excludedControllers).filter((name) => !controllers.has(name))) {
            this.issue('error', 'ORPHAN_EXPORT_DECISION', `Excluded controller "${controller}" has no routes.`);
        }

        // An approval must never contradict a policy exclusion: the configuration has to say one thing.
        for (const operation of operations) {
            if (this.approved.has(operation.key) && operation.customerExport.status !== 'included') {
                this.issue(
                    'error',
                    'CONFLICTING_EXPORT_DECISION',
                    `${operation.key} is approved for the customer export but excluded: ${operation.customerExport.reason}`,
                    operation.key,
                );
            }
        }
    }

    private ruleFor(component: ExtractedComponent): ComponentRule | undefined {
        const table =
            component.kind === 'guard'
                ? this.guardRules
                : component.kind === 'interceptor'
                  ? this.interceptorRules
                  : this.pipeRules;

        return table[component.name];
    }

    private domainOf(controllerName: string): { name: string; index: number } {
        const index = this.config.domains.findIndex((domain) => domain.controllers.includes(controllerName));

        return index >= 0
            ? { name: this.config.domains[index]?.name ?? 'Unassigned', index }
            : { name: 'Unassigned', index: this.config.domains.length };
    }

    private async buildOperation(route: ExtractedRoute): Promise<Operation> {
        const key = operationKey(route.method, route.path);
        const override = this.overrides[key] ?? {};
        const discrepancies: string[] = [...route.extractionNotes];
        const notes: string[] = [];
        const headers = new Map<string, HeaderAccumulator>();
        const schemes: AuthScheme[] = [];
        const authorizationNotes: string[] = [];
        const allComponents = [...route.components, ...route.params.flatMap((param) => param.pipes)];

        const addHeader = (read: HeaderRead, origin: string) => {
            const existing = headers.get(read.name.toLowerCase());

            if (existing) {
                existing.required = existing.required || read.required;
                existing.origins.push(origin);
                if (read.required) {
                    existing.descriptions.unshift(read.description);
                } else {
                    existing.descriptions.push(read.description);
                }
            } else {
                headers.set(read.name.toLowerCase(), {
                    name: read.name,
                    required: read.required,
                    type: read.type,
                    descriptions: [read.description],
                    origins: [origin],
                });
            }
        };

        for (const component of allComponents) {
            const rule = this.ruleFor(component);

            if (!rule) {
                this.issue(
                    'error',
                    'UNCLASSIFIED_COMPONENT',
                    `${component.kind} ${component.name} on ${key} is not classified in config/components.config.ts.`,
                    key,
                );
                continue;
            }

            if (rule.authScheme && !schemes.includes(rule.authScheme)) {
                schemes.push(rule.authScheme);
            }

            if (rule.note && ['authentication', 'authorization', 'scope'].includes(rule.role)) {
                if (!authorizationNotes.includes(rule.note)) {
                    authorizationNotes.push(rule.note);
                }
            } else if (rule.note && rule.role === 'observability' && !notes.includes(rule.note)) {
                notes.push(rule.note);
            }

            for (const read of rule.readsHeaders ?? []) {
                addHeader(read, component.name);
            }
        }

        const source = this.context.sourceIndex.findClass(route.controllerName);
        const sourceMethod = source?.methods.find((method) => method.name === route.handlerName);

        if (sourceMethod && sourceMethod.httpDecorators.length > 1) {
            discrepancies.push(
                `The handler carries ${sourceMethod.httpDecorators.map((name) => `@${name}()`).join(' and ')}; Nest keeps only one request method per handler, so only ${route.method} is registered. Express still answers HEAD for GET routes.`,
            );
        }

        const pathParams: InputParam[] = [];
        const queryParams: InputParam[] = [];
        let queryDoc: DtoDoc | undefined;
        let body: BodyModel | undefined;

        const pathParamTypes = new Map<string, ExtractedParameter>();

        for (const param of route.params) {
            switch (param.source) {
                case 'path':
                    if (typeof param.data === 'string') {
                        pathParamTypes.set(param.data, param);
                    } else {
                        this.issue(
                            'error',
                            'UNSUPPORTED_INPUT',
                            `${key} binds all path parameters to one object (@Param()).`,
                            key,
                        );
                    }
                    break;
                case 'query':
                    if (typeof param.data === 'string') {
                        queryParams.push(this.singleQueryParam(param, route));
                    } else if (param.metatype) {
                        queryDoc = this.context.analyzer.analyze(param.metatype);
                        queryParams.push(...(await this.queryParams(queryDoc, route, param, override, key)));
                    }
                    break;
                case 'body':
                    if (typeof param.data === 'string' || !param.metatype || param.metatype === Object) {
                        this.issue(
                            'error',
                            'UNSUPPORTED_INPUT',
                            `${key} reads the body without a DTO class; document it with an override.`,
                            key,
                        );
                    } else {
                        body = await this.bodyModel(route, param, override, key);
                    }
                    break;
                case 'headers':
                    if (typeof param.data === 'string') {
                        addHeader(
                            {
                                name: param.data,
                                required: true,
                                type: paramTypeName(param.metatype),
                                description: 'Read by the handler.',
                            },
                            `${route.handlerName}()`,
                        );
                    } else {
                        this.issue('error', 'UNSUPPORTED_INPUT', `${key} reads all headers (@Headers()).`, key);
                    }
                    break;
                case 'custom': {
                    const rule = this.paramResolver.resolve(param.customFactory);

                    if (!rule) {
                        this.issue(
                            'error',
                            'UNCLASSIFIED_PARAM_DECORATOR',
                            `${key} uses an unclassified custom parameter decorator at index ${param.index}.`,
                            key,
                        );
                    } else if (rule.header) {
                        addHeader(rule.header, `@${rule.name}()`);
                    } else if (rule.derived && !authorizationNotes.includes(rule.derived)) {
                        authorizationNotes.push(rule.derived);
                    }
                    break;
                }
                case 'request': {
                    const usage = this.config.requestObjectUsages[key];

                    if (usage) {
                        notes.push(usage);
                    } else {
                        this.issue(
                            'error',
                            'UNEXPLAINED_REQUEST_OBJECT',
                            `${key} reads the raw request (@Req()); explain the inputs in requestObjectUsages.`,
                            key,
                        );
                    }
                    break;
                }
                case 'response': {
                    const download = this.config.downloadResponses[key];
                    const passthrough = this.config.passthroughResponses[key];

                    if (download) {
                        notes.push(`Response: ${download}`);
                    } else if (passthrough) {
                        notes.push(`Response status: ${passthrough}`);
                    } else {
                        this.issue(
                            'warning',
                            'UNDOCUMENTED_RESPONSE_OBJECT',
                            `${key} writes the response directly (@Res()).`,
                            key,
                        );
                    }
                    break;
                }
                default:
                    this.issue(
                        'error',
                        'UNSUPPORTED_INPUT',
                        `${key} uses an unsupported argument source "${param.source}".`,
                        key,
                    );
            }
        }

        if (!body && schemes.includes('localCredentials')) {
            body = this.credentialsBody(route, key);
        }

        for (const name of pathParameterNames(route.path)) {
            pathParams.push(this.pathParam(route, name, pathParamTypes.get(name), override));
        }

        const auth: AuthRequirement = { schemes, authorizationNotes };
        const headerParams = this.headerParams(headers, auth, route, discrepancies);
        const domain = this.domainOf(route.controllerName);
        const label = labelFromHandler(route.handlerName);
        const swaggerExcluded = route.swaggerExcludedController || route.swaggerExcludedEndpoint;

        if (schemes.length === 0) {
            discrepancies.push('No authentication guard: the route is reachable without credentials (code-verified).');
        }

        if (body && bodyClassOf(route) && !body.validationEnforced) {
            discrepancies.push(
                `No ValidationPipe on this route: the rules of ${body.dtoName} are documented but not enforced.`,
            );
        }

        if (queryDoc && !hasValidationPipe(route.components, [])) {
            discrepancies.push(
                `No ValidationPipe on this route: the rules of ${queryDoc.className} are documented but not enforced; query values arrive as strings.`,
            );
        }

        const bodyClass = this.bodyClass(route);
        const swaggerHidden = route.swaggerExcludedController || route.swaggerExcludedEndpoint;

        for (const doc of [queryDoc, body && bodyClass ? this.context.analyzer.analyze(bodyClass) : undefined]) {
            for (const property of doc?.undecoratedProperties ?? []) {
                discrepancies.push(
                    `${doc?.className}.${property} is declared without decorators: accepted but neither validated nor documented.`,
                );
            }

            for (const field of doc?.fields ?? []) {
                const swaggerNotes = field.notes.filter(
                    (entry) =>
                        entry.startsWith('Swagger') &&
                        !(swaggerHidden && entry.startsWith('Swagger: property not documented')),
                );

                for (const note of swaggerNotes) {
                    discrepancies.push(`${doc?.className}.${field.path}: ${note}`);
                }
            }
        }

        const operation: Operation = {
            key,
            method: route.method,
            path: route.path,
            domain: domain.name,
            moduleName: route.moduleName,
            controllerName: route.controllerName,
            handlerName: route.handlerName,
            sourceFile: source?.file,
            label,
            displayName: `${route.method} ${route.path} - ${label}`,
            fileStem: fileStem(route.method, route.path),
            auth,
            pathParams,
            queryParams,
            headers: headerParams,
            query: queryDoc,
            body,
            responses: this.responses(route),
            swaggerExcluded,
            customerExport: this.customerExport(key, route.path, schemes, domain.name, route.controllerName),
            discrepancies: [...new Set(discrepancies)],
            notes,
            description: '',
            order: domain.index * 1_000_000 + route.registrationIndex,
        };

        if (override.description) {
            operation.notes.push(override.description);
        }

        operation.description = describeOperation(operation);

        return operation;
    }

    private bodyClass(route: ExtractedRoute): ClassRef | undefined {
        return route.params.find((param) => param.source === 'body')?.metatype;
    }

    private headerParams(
        headers: Map<string, HeaderAccumulator>,
        auth: AuthRequirement,
        route: ExtractedRoute,
        discrepancies: string[],
    ): InputParam[] {
        const result: InputParam[] = [];

        // Postman's auth helper sends one credential; a second one becomes an explicit header row.
        if (auth.schemes.includes('apiKey') && auth.schemes.includes('jwt')) {
            result.push({
                name: 'X-API-Key',
                location: 'header',
                type: 'string',
                required: true,
                description: 'Static API key of the PRA platform (internal). Sent in addition to the bearer token.',
                value: '{{apiKey}}',
                variable: 'apiKey',
                constraints: [],
                isArray: false,
                origin: 'ApiKeyAuthGuard',
            });
        }

        const sorted = [...headers.values()]
            .filter((header) => !AUTH_HEADERS.has(header.name.toLowerCase()))
            .sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name));

        for (const header of sorted) {
            const variable =
                header.name === 'X-Tenant-Id'
                    ? 'tenantId'
                    : header.name === 'X-Transaction-Id'
                      ? 'transactionId'
                      : undefined;

            result.push({
                name: header.name,
                location: 'header',
                type: header.type,
                required: header.required,
                description: header.descriptions[0] ?? '',
                value: variable ? `{{${variable}}}` : '',
                variable,
                constraints: [],
                isArray: false,
                origin: [...new Set(header.origins)].join(', '),
            });
        }

        const effective = new Map(result.map((header) => [header.name.toLowerCase(), header]));

        for (const swaggerHeader of route.swaggerHeaders) {
            const actual = effective.get(swaggerHeader.name.toLowerCase());

            if (!actual && !AUTH_HEADERS.has(swaggerHeader.name.toLowerCase())) {
                discrepancies.push(`Swagger documents header ${swaggerHeader.name}, but the route does not read it.`);
            } else if (actual && swaggerHeader.required !== undefined && swaggerHeader.required !== actual.required) {
                discrepancies.push(
                    `Swagger declares header ${swaggerHeader.name} required: ${String(swaggerHeader.required)}; effective: ${actual.required ? 'required (read by the handler)' : 'optional'}.`,
                );
            }
        }

        return result;
    }

    private pathParam(
        route: ExtractedRoute,
        name: string,
        param: ExtractedParameter | undefined,
        override: RequestOverride,
    ): InputParam {
        const swagger = route.swaggerParameters.find(
            (entry) => entry.name === name && (entry.in === 'path' || entry.in === undefined),
        );
        const swaggerEnum = override.pathEnums?.[name] ?? swagger?.enum ?? swagger?.schema?.enum;
        const enumValues = swaggerEnum
            ? Object.values(swaggerEnum as Record<string, string | number>).filter(
                  (value) => typeof value === 'string' || typeof value === 'number',
              )
            : undefined;
        const literal = override.pathValues?.[name] ?? (enumValues?.length ? String(enumValues[0]) : undefined);
        const type = enumValues?.length ? 'enum' : paramTypeName(param?.metatype);
        const constraints: string[] = [];

        if (!param) {
            constraints.push('not bound by @Param(); read by a pipe or not used by the handler');
        }

        if (literal !== undefined) {
            return {
                name,
                location: 'path',
                type,
                required: true,
                description: swagger?.description ?? `Path parameter ${name}.`,
                value: literal,
                enumValues,
                constraints,
                isArray: false,
                origin: param ? '@Param()' : 'route path',
            };
        }

        const variable = pathVariableName(route.path, name, this.config.pathVariableNames);
        const isIdentifier = /Id$/.test(variable);
        const resource = humanize(variable.replace(/Id$/, '')).toLowerCase();
        const meaning = isIdentifier ? `Id of the ${resource}` : `Value of the path parameter ${name}`;

        this.pathVariables.set(
            variable,
            `${meaning} addressed by path parameters. Set it before sending; it is intentionally empty.`,
        );

        return {
            name,
            location: 'path',
            type,
            required: true,
            description: swagger?.description ?? `${meaning}.`,
            value: `{{${variable}}}`,
            variable,
            constraints,
            isArray: false,
            origin: param ? '@Param()' : 'route path',
        };
    }

    private singleQueryParam(param: ExtractedParameter, route: ExtractedRoute): InputParam {
        const name = String(param.data);

        return {
            name,
            location: 'query',
            type: paramTypeName(param.metatype),
            required: false,
            description: `Query parameter read by ${route.handlerName}().`,
            value: '',
            constraints: [],
            isArray: false,
            origin: '@Query()',
        };
    }

    private async queryParams(
        doc: DtoDoc,
        route: ExtractedRoute,
        param: ExtractedParameter,
        override: RequestOverride,
        key: string,
    ): Promise<InputParam[]> {
        const params: InputParam[] = [];
        const requiredValues: Record<string, string | string[]> = {};
        const allValues: Record<string, string | string[]> = {};

        for (const field of childFields(doc.fields, undefined)) {
            const example =
                override.queryValues?.[field.name] ??
                queryValueString(field.defaultValue ?? buildFieldExample(doc.fields, field));
            const required = field.required === 'required';
            const details = [
                sentence(field.description ?? humanize(field.name)),
                field.isArray ? 'Repeat the parameter for several values (`?name=a&name=b`).' : '',
            ].filter(Boolean);

            params.push({
                name: field.name,
                location: 'query',
                type: field.type,
                required,
                description: details.join(' '),
                value: example,
                enumValues: field.enumValues,
                defaultValue: field.defaultValue,
                format: field.format,
                constraints: field.constraints,
                isArray: field.isArray,
                origin: doc.className,
            });

            allValues[field.name] = field.isArray ? [example] : example;
            if (required) {
                requiredValues[field.name] = allValues[field.name] as string;
            }
        }

        const pipes = runnablePipes(route.components, param.pipes);

        if (pipes.length > 0) {
            for (const [label, values] of [
                ['required query parameters', requiredValues],
                ['all query parameters', allValues],
            ] as const) {
                const result = await runPipes(pipes, values, 'query', param.metatype);

                if (!result.ok) {
                    this.issue(
                        'error',
                        'INVALID_QUERY_EXAMPLE',
                        `${key}: example ${label} fail validation: ${result.errors.join('; ')}`,
                        key,
                    );
                }
            }
        }

        return params;
    }

    private async bodyModel(
        route: ExtractedRoute,
        param: ExtractedParameter,
        override: RequestOverride,
        key: string,
    ): Promise<BodyModel> {
        const dto = param.metatype as ClassRef;
        const doc = this.context.analyzer.analyze(dto);
        const validationEnforced = hasValidationPipe(route.components, param.pipes);
        const nonEmptyRequired = param.pipes.some((pipe) => pipe.name === 'NonEmptyBodyPipe');
        const notes: string[] = [];
        let minimal = override.minimalBody ?? buildExample(doc.fields, 'minimal');
        const full = override.fullBody ?? buildExample(doc.fields, 'full');

        if (!override.minimalBody && nonEmptyRequired && Object.keys(minimal).length === 0) {
            const candidates = childFields(doc.fields, undefined).filter((field) => !field.readOnly);
            const chosen =
                candidates.find((field) => field.name === override.minimalPatchField) ??
                candidates.find((field) => /^(name|description|displayName|publicDisplayName)$/.test(field.name)) ??
                candidates.find((field) => field.type === 'string' && !/password|secret|token/i.test(field.name)) ??
                candidates[0];

            if (chosen) {
                minimal = { [chosen.name]: buildFieldExample(doc.fields, chosen) };
                notes.push(
                    `Every field is optional, but an empty object is rejected (NonEmptyBodyPipe). The minimal body therefore sends one field (\`${chosen.name}\`); send only the fields you want to change.`,
                );
            }
        }

        if (!override.minimalBody && Object.keys(minimal).length === 0 && !nonEmptyRequired) {
            notes.push(
                'Every field is optional and an empty object is accepted. Add the fields you want to send; the saved example "Full body" lists them all.',
            );
        }

        const exampleSource: BodyModel['exampleSource'] =
            override.minimalBody && override.fullBody
                ? 'override'
                : override.minimalBody || override.fullBody
                  ? 'mixed'
                  : 'generated';

        const pipes = validationEnforced
            ? runnablePipes(route.components, param.pipes)
            : runnablePipes(
                  [{ kind: 'pipe', scope: 'method', name: 'ValidationPipe', reference: undefined }],
                  param.pipes,
              );

        for (const [label, value] of [
            ['minimal', minimal],
            ['full', full],
        ] as const) {
            const result = await runPipes(pipes, structuredClone(value), 'body', dto);

            if (!result.ok) {
                this.issue(
                    'error',
                    'INVALID_BODY_EXAMPLE',
                    `${key}: ${label} body example fails validation: ${result.errors.join('; ')}`,
                    key,
                );
            }
        }

        await this.checkEffectiveRequired(doc, full, pipes, dto, key, nonEmptyRequired);

        if (Object.keys(full).length === 0) {
            notes.push(`${doc.className} declares no documented field.`);
        }

        return {
            dtoName: doc.className,
            mediaType: 'application/json',
            fields: doc.fields,
            minimal,
            full,
            validationEnforced,
            nonEmptyRequired,
            exampleSource,
            notes,
        };
    }

    /** passport-local reads `username` and `password` from the body; there is no DTO class for them. */
    private credentialsBody(route: ExtractedRoute, key: string): BodyModel {
        const field = (name: string, description: string): FieldDoc => ({
            path: name,
            name,
            ownerClass: 'LocalAuthGuard',
            type: 'string',
            required: 'required',
            acceptsNull: false,
            constraints: ['not empty'],
            description,
            isArray: false,
            hasTransform: false,
            notes: [],
        });
        const credentials = { username: 'example.user', password: 'replace-with-secret' };

        if (!route.components.some((component) => component.name === 'LocalAuthGuard')) {
            this.issue('error', 'UNSUPPORTED_INPUT', `${key}: credentials scheme without LocalAuthGuard.`, key);
        }

        return {
            dtoName: 'passport-local credentials',
            mediaType: 'application/json',
            fields: [
                field('username', 'Username of a PRA Console user.'),
                field(
                    'password',
                    'Password of that user. Never store it in the collection; type it into the request locally.',
                ),
            ],
            minimal: credentials,
            full: credentials,
            validationEnforced: false,
            nonEmptyRequired: false,
            exampleSource: 'generated',
            notes: [
                'LocalAuthGuard (passport-local) reads the fields; missing or wrong credentials end with 401. The response contains `accessToken`: store it in `jwtToken`.',
            ],
        };
    }

    /** Confirms the documented required flags by removing each top-level field from the full example. */
    private async checkEffectiveRequired(
        doc: DtoDoc,
        full: Record<string, unknown>,
        pipes: ReturnType<typeof runnablePipes>,
        dto: ClassRef,
        key: string,
        nonEmptyRequired: boolean,
    ): Promise<void> {
        await Promise.all(
            childFields(doc.fields, undefined)
                .filter((field: FieldDoc) => field.name in full)
                .map(async (field) => {
                    const reduced = { ...full };

                    delete reduced[field.name];

                    if (nonEmptyRequired && Object.keys(reduced).length === 0) {
                        return;
                    }

                    const result = await runPipes(pipes, reduced, 'body', dto);
                    const documentedRequired = field.required === 'required';

                    if (result.ok === documentedRequired) {
                        this.issue(
                            'warning',
                            'REQUIRED_FLAG_MISMATCH',
                            `${key}: ${doc.className}.${field.name} is documented as ${field.required}, but omitting it ${result.ok ? 'passes' : 'fails'} validation.`,
                            key,
                        );
                    }
                }),
        );
    }

    private responses(route: ExtractedRoute): ResponseDoc[] {
        const defaultStatus = route.httpCode ?? (route.method === 'POST' ? 201 : 200);
        const responses = new Map<number, ResponseDoc>();

        responses.set(defaultStatus, { status: defaultStatus });

        for (const swagger of route.swaggerResponses) {
            const status = Number(swagger.status);

            if (Number.isNaN(status)) {
                continue;
            }

            responses.set(status, {
                status,
                description: [
                    swagger.description,
                    swagger.typeName ? `\`${swagger.typeName}${swagger.isArray ? '[]' : ''}\`` : undefined,
                ]
                    .filter(Boolean)
                    .join(' '),
            });
        }

        return [...responses.values()].sort((a, b) => a.status - b.status);
    }

    private customerExport(
        key: string,
        path: string,
        schemes: AuthScheme[],
        domain: string,
        controllerName: string,
    ): CustomerExportDecision {
        if (schemes.includes('apiKey')) {
            return {
                status: 'excluded-policy',
                reason: 'Internal: protected by the static X-API-Key (ApiKeyAuthGuard).',
            };
        }

        if (this.internalPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
            return { status: 'excluded-policy', reason: 'Internal: access management.' };
        }

        const excludedDomain = this.excludedDomains[domain];

        if (excludedDomain) {
            return { status: 'excluded-policy', reason: `Folder ${domain}: ${excludedDomain}` };
        }

        const excludedController = this.excludedControllers[controllerName];

        if (excludedController) {
            return { status: 'excluded-policy', reason: `${controllerName}: ${excludedController}` };
        }

        const excluded = this.excluded[key];

        if (excluded) {
            return { status: 'excluded-policy', reason: excluded };
        }

        if (this.approved.has(key)) {
            return { status: 'included', reason: 'Approved for the customer export.' };
        }

        return {
            status: 'pending-decision',
            reason: 'Not yet approved for the customer export (new or unclassified operation); kept in the internal collection only.',
        };
    }
}

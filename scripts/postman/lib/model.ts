/**
 * Shared types of the Postman collection generator.
 *
 * The generator works in three stages:
 * 1. extraction: facts read from the registered NestJS controllers and DTO metadata (`Extracted*`),
 * 2. modelling: one protocol-neutral operation per registered route (`Operation*`),
 * 3. rendering: the native Postman v3 YAML collection and the Collection v2.1 JSON exports.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'ALL' | 'SEARCH' | 'QUERY';

export type ComponentKind = 'guard' | 'interceptor' | 'pipe';

export type ComponentScope = 'controller' | 'method' | 'parameter';

/** Constructor type used for reflected metadata (controllers, DTOs, guards). */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type ClassRef = Function;

export interface ExtractedComponent {
    kind: ComponentKind;
    name: string;
    scope: ComponentScope;
    /** Class or instance exactly as registered in the decorator metadata. */
    reference: unknown;
}

export type ParameterSource =
    | 'path'
    | 'query'
    | 'body'
    | 'headers'
    | 'request'
    | 'response'
    | 'next'
    | 'session'
    | 'file'
    | 'files'
    | 'host'
    | 'ip'
    | 'rawBody'
    | 'custom';

export interface ExtractedParameter {
    index: number;
    source: ParameterSource;
    /** Name passed to the decorator, for example `id` for `@Param('id')`. */
    data?: unknown;
    /** Reflected `design:paramtypes` entry. */
    metatype?: ClassRef;
    /** Factory of a custom parameter decorator (`createParamDecorator`). */
    customFactory?: unknown;
    pipes: ExtractedComponent[];
    /** `@Res({ passthrough: true })` and similar options. */
    passthrough?: boolean;
}

export interface SwaggerHeaderMetadata {
    name: string;
    required?: boolean;
    description?: string;
    schema?: { type?: string };
}

export interface SwaggerParameterMetadata {
    name?: string;
    in?: string;
    required?: boolean;
    description?: string;
    type?: unknown;
    enum?: unknown;
    schema?: { enum?: unknown; type?: string };
}

export interface SwaggerResponseMetadata {
    status: string;
    description?: string;
    typeName?: string;
    isArray?: boolean;
}

export interface ExtractedRoute {
    method: HttpMethod;
    path: string;
    moduleName: string;
    controllerName: string;
    controllerClass: ClassRef;
    handlerName: string;
    /** Order in which Nest registers the route (module scan order, controller order, method order). */
    registrationIndex: number;
    components: ExtractedComponent[];
    params: ExtractedParameter[];
    httpCode?: number;
    swaggerExcludedController: boolean;
    swaggerExcludedEndpoint: boolean;
    swaggerHeaders: SwaggerHeaderMetadata[];
    swaggerParameters: SwaggerParameterMetadata[];
    swaggerResponses: SwaggerResponseMetadata[];
    swaggerSummary?: string;
    /** Notes about metadata that Nest ignores, for example a second request method on the same handler. */
    extractionNotes: string[];
}

export interface ExtractedController {
    moduleName: string;
    controllerName: string;
    controllerClass: ClassRef;
    routeCount: number;
}

export interface ExtractionResult {
    controllers: ExtractedController[];
    routes: ExtractedRoute[];
}

/** Field of a request body or query DTO, flattened into a dotted path for nested objects. */
export interface FieldDoc {
    /** Dotted path with `[]` for array items, for example `siteManagers[].email`. */
    path: string;
    /** Wire name (after `@Expose({ name })`). */
    name: string;
    /** DTO class that declares the property (key prefix of FIELD_EXAMPLES). */
    ownerClass: string;
    type: string;
    required: 'required' | 'optional' | 'conditional';
    /** True when validation accepts `null` (class-validator `@IsOptional` skips null as well). */
    acceptsNull: boolean;
    defaultValue?: unknown;
    enumValues?: Array<string | number>;
    format?: string;
    constraints: string[];
    description?: string;
    /** Swagger `required` flag, to report differences to the effective validation. */
    swaggerRequired?: boolean;
    readOnly?: boolean;
    /** Nested DTO class of an object or array item, if any. */
    nestedClass?: ClassRef;
    isArray: boolean;
    /** Custom transformation present (for example name sanitising or single value to array). */
    hasTransform: boolean;
    notes: string[];
}

export interface DtoDoc {
    className: string;
    fields: FieldDoc[];
    /** Properties declared in source without any runtime decorator (accepted but undocumented). */
    undecoratedProperties: string[];
    /** Validation constraint names the generator does not translate. */
    unmappedConstraints: string[];
}

export type AuthScheme = 'accessKey' | 'apiKey' | 'jwt' | 'localCredentials';

export interface AuthRequirement {
    /** Credentials that must all be sent. Empty means the route has no authentication guard. */
    schemes: AuthScheme[];
    /** Authorisation rules applied after authentication (scopes, allow-lists). */
    authorizationNotes: string[];
}

export interface InputParam {
    name: string;
    location: 'path' | 'query' | 'header';
    type: string;
    required: boolean;
    description: string;
    /** Value used in the request row; for path parameters a `{{variable}}` reference or a literal. */
    value: string;
    enumValues?: Array<string | number>;
    defaultValue?: unknown;
    format?: string;
    constraints: string[];
    /** Repeated keys for arrays (`?a=1&a=2`). */
    isArray: boolean;
    /** Collection variable used for the value, if any. */
    variable?: string;
    origin: string;
}

export interface BodyModel {
    dtoName: string;
    mediaType: 'application/json';
    fields: FieldDoc[];
    minimal: Record<string, unknown>;
    full: Record<string, unknown>;
    /** Whether the route runs a ValidationPipe on the body. */
    validationEnforced: boolean;
    nonEmptyRequired: boolean;
    /** Source of the examples: generated from metadata or taken from an override. */
    exampleSource: 'generated' | 'override' | 'mixed';
    notes: string[];
}

export type CustomerExportStatus = 'included' | 'excluded-policy' | 'pending-decision';

export interface CustomerExportDecision {
    status: CustomerExportStatus;
    reason: string;
}

export interface ResponseDoc {
    status: number;
    description?: string;
    mediaType?: string;
}

export interface Operation {
    /** `METHOD /path` with Nest path parameters, unique per collection. */
    key: string;
    method: HttpMethod;
    path: string;
    domain: string;
    moduleName: string;
    controllerName: string;
    handlerName: string;
    sourceFile?: string;
    label: string;
    displayName: string;
    fileStem: string;
    auth: AuthRequirement;
    pathParams: InputParam[];
    queryParams: InputParam[];
    headers: InputParam[];
    query?: DtoDoc;
    body?: BodyModel;
    responses: ResponseDoc[];
    swaggerExcluded: boolean;
    customerExport: CustomerExportDecision;
    discrepancies: string[];
    notes: string[];
    description: string;
    order: number;
}

export interface FolderModel {
    name: string;
    description: string;
    order: number;
    /** Uniform authentication of all operations in the folder; undefined inherits from the parent. */
    auth?: AuthScheme[];
    folders: FolderModel[];
    operations: Operation[];
}

export interface VariableModel {
    key: string;
    value: string;
    description: string;
    secret: boolean;
}

export interface CollectionModel {
    name: string;
    version: string;
    description: string;
    variables: VariableModel[];
    folders: FolderModel[];
}

export interface Issue {
    severity: 'error' | 'warning';
    code: string;
    message: string;
    operation?: string;
}

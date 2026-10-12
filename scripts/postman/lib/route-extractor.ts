import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
    CUSTOM_ROUTE_ARGS_METADATA,
    GUARDS_METADATA,
    HOST_METADATA,
    HTTP_CODE_METADATA,
    INTERCEPTORS_METADATA,
    METHOD_METADATA,
    MODULE_METADATA,
    PATH_METADATA,
    PIPES_METADATA,
    ROUTE_ARGS_METADATA,
    VERSION_METADATA,
} from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { MetadataScanner } from '@nestjs/core';
import { SWAGGER_METADATA } from './swagger-metadata';
import {
    ClassRef,
    ComponentKind,
    ComponentScope,
    ExtractedComponent,
    ExtractedController,
    ExtractedParameter,
    ExtractedRoute,
    ExtractionResult,
    HttpMethod,
    ParameterSource,
    SwaggerHeaderMetadata,
    SwaggerParameterMetadata,
    SwaggerResponseMetadata,
} from './model';

/**
 * Reads the registered HTTP routes of a NestJS application from decorator metadata.
 *
 * The extractor walks the module graph exactly like Nest's dependency scanner (imports first, depth first,
 * in declaration order) and reads the same metadata the router explorer uses. It never creates an
 * application: no providers are instantiated, no database connection is opened, no lifecycle hook runs.
 */

const PARAM_SOURCES: Record<number, ParameterSource> = {
    [RouteParamtypes.REQUEST]: 'request',
    [RouteParamtypes.RESPONSE]: 'response',
    [RouteParamtypes.NEXT]: 'next',
    [RouteParamtypes.BODY]: 'body',
    [RouteParamtypes.QUERY]: 'query',
    [RouteParamtypes.PARAM]: 'path',
    [RouteParamtypes.HEADERS]: 'headers',
    [RouteParamtypes.SESSION]: 'session',
    [RouteParamtypes.FILE]: 'file',
    [RouteParamtypes.FILES]: 'files',
    [RouteParamtypes.HOST]: 'host',
    [RouteParamtypes.IP]: 'ip',
    [RouteParamtypes.RAW_BODY]: 'rawBody',
};

interface DynamicModuleLike {
    module: ClassRef;
    imports?: unknown[];
    controllers?: ClassRef[];
}

interface RouteArgumentMetadata {
    index: number;
    data?: unknown;
    pipes?: unknown[];
    factory?: unknown;
}

interface SwaggerApiResponseMetadata {
    description?: string;
    type?: unknown;
    isArray?: boolean;
}

function isForwardReference(value: unknown): value is { forwardRef: () => unknown } {
    return typeof value === 'object' && value !== null && 'forwardRef' in value;
}

function isDynamicModule(value: unknown): value is DynamicModuleLike {
    return typeof value === 'object' && value !== null && 'module' in value;
}

function componentName(reference: unknown): string {
    if (typeof reference === 'function') {
        return (reference as { name: string }).name || 'anonymous';
    }

    if (typeof reference === 'object' && reference !== null) {
        return (reference.constructor as { name: string }).name || 'anonymous';
    }

    return String(reference);
}

function typeName(reference: unknown): string | undefined {
    if (typeof reference === 'function') {
        return (reference as { name: string }).name;
    }

    if (typeof reference === 'string') {
        return reference;
    }

    return undefined;
}

/** Joins controller and method paths the way Nest does (leading slash, no duplicate or trailing slashes). */
export function joinRoutePath(...segments: string[]): string {
    const parts = segments
        .flatMap((segment) => segment.split('/'))
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

    return `/${parts.join('/')}`;
}

function asPathArray(value: unknown): string[] {
    if (value === undefined || value === null) {
        return ['/'];
    }

    const values: unknown[] = Array.isArray(value) ? (value as unknown[]) : [value];

    return values.map((entry) => (typeof entry === 'string' ? entry : JSON.stringify(entry)));
}

function readComponents(kind: ComponentKind, scope: ComponentScope, target: object, key: string): ExtractedComponent[] {
    const references = (Reflect.getMetadata(key, target) as unknown[] | undefined) ?? [];

    return references.map((reference) => ({ kind, scope, name: componentName(reference), reference }));
}

function readParameters(controllerClass: ClassRef, handlerName: string): ExtractedParameter[] {
    const prototype = controllerClass.prototype as object;
    const routeArgs =
        (Reflect.getMetadata(ROUTE_ARGS_METADATA, controllerClass, handlerName) as
            | Record<string, RouteArgumentMetadata>
            | undefined) ?? {};
    const paramTypes =
        (Reflect.getMetadata('design:paramtypes', prototype, handlerName) as ClassRef[] | undefined) ?? [];

    return Object.entries(routeArgs)
        .map(([key, metadata]): ExtractedParameter => {
            const isCustom = key.includes(CUSTOM_ROUTE_ARGS_METADATA);
            const paramType = Number(key.split(':')[0]);
            const source: ParameterSource = isCustom ? 'custom' : (PARAM_SOURCES[paramType] ?? 'custom');
            const pipes = (metadata.pipes ?? []).map((reference) => ({
                kind: 'pipe' as const,
                scope: 'parameter' as const,
                name: componentName(reference),
                reference,
            }));

            return {
                index: metadata.index,
                source,
                data: metadata.data,
                metatype: paramTypes[metadata.index],
                customFactory: isCustom ? metadata.factory : undefined,
                pipes,
            };
        })
        .sort((a, b) => a.index - b.index);
}

function readSwaggerResponses(handler: object): SwaggerResponseMetadata[] {
    const responses =
        (Reflect.getMetadata(SWAGGER_METADATA.apiResponse, handler) as
            | Record<string, SwaggerApiResponseMetadata>
            | undefined) ?? {};

    return Object.entries(responses)
        .map(([status, response]) => ({
            status,
            description: response.description,
            typeName: typeName(response.type),
            isArray: response.isArray,
        }))
        .sort((a, b) => a.status.localeCompare(b.status));
}

function toHttpMethod(value: unknown): HttpMethod {
    const name = RequestMethod[value as RequestMethod];

    return (name ?? 'GET') as HttpMethod;
}

/** Resolves a module reference (class, dynamic module, promise or forward reference). */
async function resolveModule(reference: unknown): Promise<unknown> {
    let resolved = reference;

    if (isForwardReference(resolved)) {
        resolved = resolved.forwardRef();
    }

    if (resolved instanceof Promise) {
        resolved = await resolved;
    }

    return resolved;
}

/** Collects the controllers in Nest registration order, keyed by the module that declares them. */
export async function collectControllers(
    rootModule: unknown,
): Promise<Array<{ moduleName: string; controller: ClassRef }>> {
    const visited = new Set<unknown>();
    const controllers: Array<{ moduleName: string; controller: ClassRef }> = [];

    async function visit(reference: unknown): Promise<void> {
        const resolved = await resolveModule(reference);

        if (resolved === undefined || resolved === null || visited.has(resolved)) {
            return;
        }

        visited.add(resolved);

        const moduleClass = isDynamicModule(resolved) ? resolved.module : (resolved as ClassRef);
        const dynamicPart = isDynamicModule(resolved) ? resolved : undefined;
        const moduleName = componentName(moduleClass);
        const imports = [
            ...((Reflect.getMetadata(MODULE_METADATA.IMPORTS, moduleClass) as unknown[] | undefined) ?? []),
            ...(dynamicPart?.imports ?? []),
        ];
        const declaredControllers = [
            ...((Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, moduleClass) as ClassRef[] | undefined) ?? []),
            ...(dynamicPart?.controllers ?? []),
        ];

        // Nest registers the module (and its controllers) before scanning its imports.
        for (const controller of declaredControllers) {
            controllers.push({ moduleName, controller });
        }

        for (const imported of imports) {
            await visit(imported);
        }
    }

    await visit(rootModule);

    return controllers;
}

/** Extracts every route of every registered controller. */
export async function extractRoutes(rootModule: unknown): Promise<ExtractionResult> {
    const scanner = new MetadataScanner();
    const registered = await collectControllers(rootModule);
    const routes: ExtractedRoute[] = [];
    const controllers: ExtractedController[] = [];
    let registrationIndex = 0;

    for (const { moduleName, controller } of registered) {
        const controllerPaths = asPathArray(Reflect.getMetadata(PATH_METADATA, controller));
        const prototype = controller.prototype as Record<string, unknown>;
        const classComponents = [
            ...readComponents('guard', 'controller', controller, GUARDS_METADATA),
            ...readComponents('interceptor', 'controller', controller, INTERCEPTORS_METADATA),
            ...readComponents('pipe', 'controller', controller, PIPES_METADATA),
        ];
        const swaggerExcludedController = Boolean(
            (Reflect.getMetadata(SWAGGER_METADATA.apiExcludeController, controller) as unknown[] | undefined)?.[0],
        );
        const classHeaders =
            (Reflect.getMetadata(SWAGGER_METADATA.apiHeaders, controller) as SwaggerHeaderMetadata[] | undefined) ?? [];
        const classNotes: string[] = [];

        if (Reflect.getMetadata(VERSION_METADATA, controller) !== undefined) {
            classNotes.push('Controller declares a version, but URI versioning is not enabled in src/main.ts.');
        }

        if (Reflect.getMetadata(HOST_METADATA, controller) !== undefined) {
            classNotes.push('Controller declares a host restriction.');
        }

        let routeCount = 0;

        for (const handlerName of scanner.getAllMethodNames(prototype)) {
            const handler = prototype[handlerName] as object;
            const methodPath = Reflect.getMetadata(PATH_METADATA, handler) as unknown;

            if (methodPath === undefined) {
                continue;
            }

            const method = toHttpMethod(Reflect.getMetadata(METHOD_METADATA, handler));
            const methodComponents = [
                ...readComponents('guard', 'method', handler, GUARDS_METADATA),
                ...readComponents('interceptor', 'method', handler, INTERCEPTORS_METADATA),
                ...readComponents('pipe', 'method', handler, PIPES_METADATA),
            ];
            const httpCode = Reflect.getMetadata(HTTP_CODE_METADATA, handler) as HttpStatus | undefined;
            const swaggerExcludedEndpoint = Boolean(
                (Reflect.getMetadata(SWAGGER_METADATA.apiExcludeEndpoint, handler) as { disable?: boolean } | undefined)
                    ?.disable,
            );
            const methodHeaders =
                (Reflect.getMetadata(SWAGGER_METADATA.apiHeaders, handler) as SwaggerHeaderMetadata[] | undefined) ??
                [];
            const swaggerParameters =
                (Reflect.getMetadata(SWAGGER_METADATA.apiParameters, handler) as
                    | SwaggerParameterMetadata[]
                    | undefined) ?? [];
            const operation = Reflect.getMetadata(SWAGGER_METADATA.apiOperation, handler) as
                | { summary?: string }
                | undefined;
            const notes = [...classNotes];

            if (Reflect.getMetadata(VERSION_METADATA, handler) !== undefined) {
                notes.push('Handler declares a version, but URI versioning is not enabled in src/main.ts.');
            }

            for (const controllerPath of controllerPaths) {
                for (const handlerPath of asPathArray(methodPath)) {
                    routes.push({
                        method,
                        path: joinRoutePath(controllerPath, handlerPath),
                        moduleName,
                        controllerName: controller.name,
                        controllerClass: controller,
                        handlerName,
                        registrationIndex: registrationIndex++,
                        components: [...classComponents, ...methodComponents],
                        params: readParameters(controller, handlerName),
                        httpCode,
                        swaggerExcludedController,
                        swaggerExcludedEndpoint,
                        swaggerHeaders: [...classHeaders, ...methodHeaders],
                        swaggerParameters,
                        swaggerResponses: readSwaggerResponses(handler),
                        swaggerSummary: operation?.summary,
                        extractionNotes: notes,
                    });
                    routeCount += 1;
                }
            }
        }

        controllers.push({ moduleName, controllerName: controller.name, controllerClass: controller, routeCount });
    }

    return { controllers, routes };
}

import * as yaml from 'js-yaml';
import { DEFAULT_SCHEMES, sameSchemes } from './collection-builder';
import { CollectionModel, FolderModel, InputParam, Operation } from './model';
import { authSpec, bodyJson, IdFactory, paramDescription, rawUrl, statusText, successStatus } from './render-common';

/**
 * Renders the native Postman collection format (v3, one YAML file per request) as a map of relative paths
 * to file contents. Layout, verified with `postman collection migrate` and `postman collection lint`:
 *
 *   <collection>/.resources/definition.yaml                       collection: name, overview, variables, auth
 *   <collection>/<folder>/.resources/definition.yaml              folder: description, order, auth
 *   <collection>/<folder>/<request>.request.yaml                  request
 *   <collection>/<folder>/.resources/<request>.resources/examples/<example>.example.yaml
 */

export const FULL_BODY_EXAMPLE = 'Full body';

const YAML_OPTIONS: yaml.DumpOptions = { lineWidth: -1, noRefs: true, sortKeys: false, quotingType: '"' };

export function dumpYaml(value: unknown): string {
    return yaml.dump(value, YAML_OPTIONS);
}

function folderAuth(ids: IdFactory, scope: string, schemes: FolderModel['auth']): unknown[] | undefined {
    if (!schemes) {
        return undefined;
    }

    return [authEntry(ids, scope, schemes)];
}

function authEntry(ids: IdFactory, scope: string, schemes: NonNullable<FolderModel['auth']>): Record<string, unknown> {
    const spec = authSpec(schemes);
    const entry: Record<string, unknown> = { id: ids.id(`auth:${scope}`), type: spec.type };

    if (spec.type === 'noauth') {
        entry.name = 'No Auth';
    } else if (spec.type === 'bearer') {
        entry.name = 'Bearer token';
        entry.credentials = { token: spec.token };
    } else {
        entry.name = spec.key;
        entry.credentials = { key: spec.key, value: spec.value, in: 'header' };
    }

    return entry;
}

function requestAuth(operation: Operation, inherited: FolderModel['auth']): Record<string, unknown> | undefined {
    const effectiveParent = inherited ?? DEFAULT_SCHEMES;

    if (sameSchemes(operation.auth.schemes, effectiveParent)) {
        return undefined;
    }

    const spec = authSpec(operation.auth.schemes);

    if (spec.type === 'noauth') {
        return { type: 'noauth' };
    }

    if (spec.type === 'bearer') {
        return { type: 'bearer', credentials: { token: spec.token } };
    }

    return { type: 'apikey', credentials: { key: spec.key, value: spec.value, in: 'header' } };
}

function rows(params: InputParam[]): Array<Record<string, unknown>> {
    return params.map((param) => {
        const row: Record<string, unknown> = { key: param.name, value: param.value };

        if (!param.required) {
            row.disabled = true;
        }

        row.description = paramDescription(param);

        return row;
    });
}

function requestFile(ids: IdFactory, operation: Operation, inherited: FolderModel['auth'], order: number): string {
    const request: Record<string, unknown> = {
        $kind: 'http-request',
        id: ids.id(`request:${operation.key}`),
        name: operation.displayName,
        description: operation.description,
        url: rawUrl(operation),
        method: operation.method,
    };

    if (operation.headers.length) {
        request.headers = rows(operation.headers);
    }

    if (operation.queryParams.length) {
        request.queryParams = rows(operation.queryParams);
    }

    if (operation.pathParams.length) {
        request.pathVariables = operation.pathParams.map((param) => ({
            key: param.name,
            value: param.value,
            description: paramDescription(param),
        }));
    }

    const auth = requestAuth(operation, inherited);

    if (auth) {
        request.auth = auth;
    }

    if (operation.body) {
        request.body = { type: 'json', content: bodyJson(operation.body.minimal) };
        request.examples = `./.resources/${operation.fileStem}.resources/examples`;
    }

    request.order = order;

    return dumpYaml(request);
}

function exampleFile(operation: Operation): string {
    const status = successStatus(operation);

    return dumpYaml({
        $kind: 'http-example',
        request: {
            url: rawUrl(operation),
            method: operation.method,
            body: { type: 'json', content: bodyJson(operation.body?.full ?? {}) },
        },
        response: {
            statusCode: status,
            statusText: statusText(status),
            body: { type: 'text', content: '' },
        },
        order: 1000,
    });
}

function writeFolder(
    files: Map<string, string>,
    ids: IdFactory,
    folder: FolderModel,
    directory: string,
    inherited: FolderModel['auth'],
): void {
    const definition: Record<string, unknown> = {
        $kind: 'collection',
        id: ids.id(`folder:${directory}`),
        description: folder.description,
    };
    const auth = folderAuth(ids, directory, folder.auth);

    if (auth) {
        definition.auth = auth;
    }

    definition.order = folder.order;
    files.set(`${directory}/.resources/definition.yaml`, dumpYaml(definition));

    const effective = folder.auth ?? inherited;

    for (const child of folder.folders) {
        writeFolder(files, ids, child, `${directory}/${child.name}`, effective);
    }

    folder.operations.forEach((operation, index) => {
        files.set(
            `${directory}/${operation.fileStem}.request.yaml`,
            requestFile(ids, operation, effective, (index + 1) * 1000),
        );

        if (operation.body) {
            files.set(
                `${directory}/.resources/${operation.fileStem}.resources/examples/${FULL_BODY_EXAMPLE}.example.yaml`,
                exampleFile(operation),
            );
        }
    });
}

/** Files of the native collection, keyed by path relative to the collection directory. */
export function renderNativeCollection(model: CollectionModel, ids: IdFactory): Map<string, string> {
    const files = new Map<string, string>();

    files.set(
        '.resources/definition.yaml',
        dumpYaml({
            $kind: 'collection',
            id: ids.id('collection:native'),
            name: model.name,
            description: model.description,
            variables: Object.fromEntries(model.variables.map((variable) => [variable.key, variable.value])),
            auth: [authEntry(ids, 'collection', DEFAULT_SCHEMES)],
        }),
    );

    for (const folder of model.folders) {
        writeFolder(files, ids, folder, folder.name, undefined);
    }

    return new Map([...files.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

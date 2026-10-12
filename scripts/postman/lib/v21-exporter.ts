import { DEFAULT_SCHEMES, sameSchemes } from './collection-builder';
import { AuthScheme, CollectionModel, FolderModel, InputParam, Operation } from './model';
import { authSpec, bodyJson, IdFactory, paramDescription, rawUrl, statusText, successStatus } from './render-common';
import { FULL_BODY_EXAMPLE } from './v3-writer';

/**
 * Renders an importable Postman Collection v2.1 JSON document (the format of the Console download).
 * Folders nest recursively; descriptions, auth, variables and the "Full body" examples are kept.
 */

export const V21_SCHEMA_URL = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

type Json = Record<string, unknown>;

function authJson(schemes: AuthScheme[]): Json {
    const spec = authSpec(schemes);

    if (spec.type === 'noauth') {
        return { type: 'noauth' };
    }

    if (spec.type === 'bearer') {
        return { type: 'bearer', bearer: [{ key: 'token', value: spec.token, type: 'string' }] };
    }

    return {
        type: 'apikey',
        apikey: [
            { key: 'key', value: spec.key, type: 'string' },
            { key: 'value', value: spec.value, type: 'string' },
            { key: 'in', value: 'header', type: 'string' },
        ],
    };
}

function rows(params: InputParam[]): Json[] {
    return params.map((param) => {
        const row: Json = { key: param.name, value: param.value, description: paramDescription(param) };

        if (!param.required) {
            row.disabled = true;
        }

        return row;
    });
}

function urlJson(operation: Operation): Json {
    const url: Json = {
        raw: rawUrl(operation),
        host: ['{{baseUrl}}'],
        path: operation.path.split('/').filter(Boolean),
    };

    if (operation.queryParams.length) {
        url.query = rows(operation.queryParams);
    }

    if (operation.pathParams.length) {
        url.variable = operation.pathParams.map((param) => ({
            key: param.name,
            value: param.value,
            description: paramDescription(param),
        }));
    }

    return url;
}

function rawBody(value: Record<string, unknown>): Json {
    return { mode: 'raw', raw: bodyJson(value), options: { raw: { language: 'json' } } };
}

function requestItem(ids: IdFactory, operation: Operation, inherited: AuthScheme[] | undefined): Json {
    const request: Json = { method: operation.method };

    if (!sameSchemes(operation.auth.schemes, inherited ?? DEFAULT_SCHEMES)) {
        request.auth = authJson(operation.auth.schemes);
    }

    request.header = rows(operation.headers);

    if (operation.body) {
        request.body = rawBody(operation.body.minimal);
    }

    request.url = urlJson(operation);
    request.description = operation.description;

    const response: Json[] = [];

    if (operation.body) {
        const status = successStatus(operation);

        response.push({
            id: ids.id(`example:${operation.key}:${FULL_BODY_EXAMPLE}`),
            name: FULL_BODY_EXAMPLE,
            originalRequest: {
                method: operation.method,
                header: rows(operation.headers),
                body: rawBody(operation.body.full),
                url: urlJson(operation),
            },
            status: statusText(status),
            code: status,
            header: [],
            cookie: [],
            body: '',
        });
    }

    return {
        id: ids.id(`request:${operation.key}`),
        name: operation.displayName,
        request,
        response,
    };
}

function folderItem(ids: IdFactory, folder: FolderModel, path: string, inherited: AuthScheme[] | undefined): Json {
    const effective = folder.auth ?? inherited;
    const item: Json = {
        id: ids.id(`folder:${path}`),
        name: folder.name,
        description: folder.description,
        item: [
            ...folder.folders.map((child) => folderItem(ids, child, `${path}/${child.name}`, effective)),
            ...folder.operations.map((operation) => requestItem(ids, operation, effective)),
        ],
    };

    if (folder.auth) {
        item.auth = authJson(folder.auth);
    }

    return item;
}

export function renderV21Collection(model: CollectionModel, ids: IdFactory, collectionId: string): Json {
    return {
        info: {
            // eslint-disable-next-line @typescript-eslint/naming-convention -- Postman format key
            _postman_id: collectionId,
            name: model.name,
            description: model.description,
            schema: V21_SCHEMA_URL,
        },
        item: model.folders.map((folder) => folderItem(ids, folder, folder.name, undefined)),
        auth: authJson(DEFAULT_SCHEMES),
        variable: model.variables.map((variable) => ({
            key: variable.key,
            value: variable.value,
            type: 'string',
            description: variable.description,
        })),
    };
}

/** Sanitised environment template: every value empty except the default base URL. */
export function renderEnvironmentTemplate(model: CollectionModel, ids: IdFactory): Json {
    return {
        id: ids.id('environment:template'),
        name: `${model.name} (template)`,
        values: model.variables
            .filter((variable) =>
                ['baseUrl', 'accessKey', 'tenantId', 'apiKey', 'jwtToken', 'transactionId'].includes(variable.key),
            )
            .map((variable) => ({
                key: variable.key,
                value: variable.key === 'baseUrl' ? variable.value : '',
                type: variable.secret ? 'secret' : 'default',
                enabled: true,
            })),
        // eslint-disable-next-line @typescript-eslint/naming-convention -- Postman format key
        _postman_variable_scope: 'environment',
    };
}

export function stringifyJson(value: unknown): string {
    return `${JSON.stringify(value, null, 4)}\n`;
}

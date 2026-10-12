import Ajv from 'ajv';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { Issue, Operation } from './model';
import { normalizedRouteKey } from './operation-builder';
import { displayValue } from './render-common';

/**
 * Independent checks of the rendered artifacts. They parse the files as Postman would read them and compare
 * them with the registered routes, so a hand edit, a stale file or a renderer bug is caught even though the
 * same generator produced them.
 */

const CREDENTIAL_VARIABLES = ['accessKey', 'apiKey', 'jwtToken'];
const AUTH_HEADER_NAMES = ['x-access-key', 'x-api-key', 'authorization'];
const POSTMAN_DYNAMIC = /^\$/;

interface Row {
    key: string;
    value: string;
    disabled?: boolean;
}

export interface RenderedRequest {
    source: string;
    method: string;
    rawUrl: string;
    queries: Row[];
    headers: Row[];
    pathVariables: Row[];
    body?: string;
}

type Json = Record<string, unknown>;

function asRows(value: unknown): Row[] {
    if (Array.isArray(value)) {
        return value.map((row: Json) => ({
            key: String(row.key),
            value: displayValue(row.value ?? ''),
            disabled: row.disabled === true,
        }));
    }

    if (value && typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>).map(([key, entry]) => ({ key, value: String(entry) }));
    }

    return [];
}

/** Requests of a native v3 collection held in memory (relative path -> content). */
export function readNativeRequests(files: Map<string, string>): RenderedRequest[] {
    return [...files.entries()]
        .filter(([file]) => file.endsWith('.request.yaml'))
        .map(([file, content]) => {
            const request = yaml.load(content) as Json;
            const body = request.body as Json | undefined;

            return {
                source: file,
                method: String(request.method),
                rawUrl: String(request.url),
                queries: asRows(request.queryParams),
                headers: asRows(request.headers),
                pathVariables: asRows(request.pathVariables),
                body: body ? displayValue(body.content ?? '') : undefined,
            };
        });
}

/** Requests of a Collection v2.1 document, walking nested folders. */
export function readV21Requests(collection: Json): RenderedRequest[] {
    const requests: RenderedRequest[] = [];

    const walk = (items: unknown[], trail: string[]) => {
        for (const item of items as Json[]) {
            if (Array.isArray(item.item)) {
                walk(item.item, [...trail, String(item.name)]);
                continue;
            }

            const request = item.request as Json;
            const url = request.url as Json;
            const body = request.body as Json | undefined;

            requests.push({
                source: [...trail, String(item.name)].join(' / '),
                method: String(request.method),
                rawUrl: String(url.raw),
                queries: asRows(url.query),
                headers: asRows(request.header),
                pathVariables: asRows(url.variable),
                body: body ? displayValue(body.raw ?? '') : undefined,
            });
        }
    };

    walk((collection.item as unknown[]) ?? [], []);

    return requests;
}

function pathOf(rawUrl: string): string {
    const withoutBase = rawUrl.replace(/^\{\{baseUrl\}\}/, '');
    const [pathPart] = withoutBase.split('?');

    return pathPart || '/';
}

function queryOf(rawUrl: string): string[] {
    const query = rawUrl.split('?')[1];

    return query ? query.split('&').map((pair) => decodeURIComponent(pair.split('=')[0] ?? '')) : [];
}

export interface RequestCheckOptions {
    label: string;
    operations: Operation[];
    variables: Map<string, string>;
    /** Operations expected in this artifact. */
    expectedKeys: Set<string>;
}

/** Coverage, duplicates, orphans, row flags, URL consistency and variable resolution. */
export function checkRenderedRequests(requests: RenderedRequest[], options: RequestCheckOptions): Issue[] {
    const issues: Issue[] = [];
    const byNormalized = new Map(
        options.operations.map((operation) => [normalizedRouteKey(operation.method, operation.path), operation]),
    );
    const expected = new Set(
        options.operations
            .filter((operation) => options.expectedKeys.has(operation.key))
            .map((operation) => normalizedRouteKey(operation.method, operation.path)),
    );
    const seen = new Map<string, string>();
    const add = (code: string, message: string, operation?: string) =>
        issues.push({ severity: 'error', code, message: `${options.label}: ${message}`, operation });

    for (const request of requests) {
        const normalized = normalizedRouteKey(request.method, pathOf(request.rawUrl));
        const operation = byNormalized.get(normalized);

        if (seen.has(normalized)) {
            add('DUPLICATE_REQUEST', `${request.source} duplicates ${seen.get(normalized) ?? ''} (${normalized}).`);
        }

        seen.set(normalized, request.source);

        if (!operation || !expected.has(normalized)) {
            add('ORPHAN_REQUEST', `${request.source} (${normalized}) does not match an expected registered route.`);
            continue;
        }

        const urlQuery = queryOf(request.rawUrl);
        const enabledQuery = request.queries.filter((row) => !row.disabled).map((row) => row.key);

        if (urlQuery.join('&') !== enabledQuery.join('&')) {
            add(
                'URL_QUERY_MISMATCH',
                `${request.source}: URL query [${urlQuery.join(', ')}] differs from enabled rows [${enabledQuery.join(', ')}].`,
                operation.key,
            );
        }

        for (const [rows, params, kind] of [
            [request.queries, operation.queryParams, 'query parameter'],
            [request.headers, operation.headers, 'header'],
        ] as const) {
            for (const param of params) {
                const row = rows.find((entry) => entry.key.toLowerCase() === param.name.toLowerCase());

                if (!row) {
                    add('MISSING_INPUT', `${request.source}: ${kind} ${param.name} is missing.`, operation.key);
                } else if (Boolean(row.disabled) === param.required) {
                    add(
                        'WRONG_OPTIONAL_FLAG',
                        `${request.source}: ${kind} ${param.name} is ${row.disabled ? 'disabled' : 'enabled'} but ${param.required ? 'required' : 'optional'}.`,
                        operation.key,
                    );
                }
            }

            for (const row of rows) {
                if (!params.some((param) => param.name.toLowerCase() === row.key.toLowerCase())) {
                    add(
                        'UNDECLARED_INPUT',
                        `${request.source}: ${kind} ${row.key} is not read by the route.`,
                        operation.key,
                    );
                }
            }
        }

        const urlVariables = [...pathOf(request.rawUrl).matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1]);
        const rowVariables = request.pathVariables.map((row) => row.key);

        if (urlVariables.join(',') !== rowVariables.join(',')) {
            add(
                'PATH_VARIABLE_MISMATCH',
                `${request.source}: path variables [${rowVariables.join(', ')}] differ from the URL [${urlVariables.join(', ')}].`,
                operation.key,
            );
        }

        for (const header of request.headers) {
            if (AUTH_HEADER_NAMES.includes(header.key.toLowerCase()) && !/^\{\{[A-Za-z]+\}\}$/.test(header.value)) {
                add(
                    'EMBEDDED_CREDENTIAL',
                    `${request.source}: header ${header.key} holds a literal value.`,
                    operation.key,
                );
            }
        }

        if (request.body !== undefined) {
            try {
                JSON.parse(request.body);
            } catch {
                add('INVALID_JSON_BODY', `${request.source}: body is not valid JSON.`, operation.key);
            }
        }
    }

    for (const normalized of expected) {
        if (!seen.has(normalized)) {
            add('MISSING_REQUEST', `no request for registered route ${normalized}.`, byNormalized.get(normalized)?.key);
        }
    }

    return issues;
}

/** Every `{{variable}}` used anywhere must be defined (Postman dynamic variables such as `{{$guid}}` excepted). */
export function checkVariables(label: string, content: string, defined: Set<string>): Issue[] {
    const used = new Set([...content.matchAll(/\{\{([^{}]+)\}\}/g)].map((match) => match[1] as string));

    return [...used]
        .filter((name) => !defined.has(name) && !POSTMAN_DYNAMIC.test(name))
        .sort()
        .map((name) => ({
            severity: 'error' as const,
            code: 'UNRESOLVED_VARIABLE',
            message: `${label}: {{${name}}} is not defined.`,
        }));
}

export function checkCredentialValues(label: string, variables: Array<{ key: string; value: unknown }>): Issue[] {
    return variables
        .filter((variable) => CREDENTIAL_VARIABLES.includes(variable.key) && displayValue(variable.value ?? '') !== '')
        .map((variable) => ({
            severity: 'error' as const,
            code: 'EMBEDDED_CREDENTIAL',
            message: `${label}: variable ${variable.key} must be exported empty.`,
        }));
}

/** Folder and request file names must be unique regardless of case within one directory. */
export function checkFileNames(files: Iterable<string>): Issue[] {
    const issues: Issue[] = [];
    const seen = new Map<string, string>();

    for (const file of files) {
        const lower = file.toLowerCase();
        const previous = seen.get(lower);

        if (previous && previous !== file) {
            issues.push({
                severity: 'error',
                code: 'FILENAME_COLLISION',
                message: `${file} collides with ${previous} on case-insensitive file systems.`,
            });
        }

        seen.set(lower, file);

        if (/[\\:*?"<>|]/.test(file)) {
            issues.push({
                severity: 'error',
                code: 'UNSAFE_FILENAME',
                message: `${file} contains characters that are not file name safe.`,
            });
        }
    }

    return issues;
}

let compiledSchema: ReturnType<Ajv['compile']> | undefined;

/** Validates a document against the official Postman Collection v2.1.0 JSON schema (vendored, draft-07). */
export function validateV21Schema(label: string, collection: unknown, schemaDirectory: string): Issue[] {
    if (!compiledSchema) {
        const schema = JSON.parse(
            fs.readFileSync(path.join(schemaDirectory, 'postman-collection-v2.1.0.draft-07.schema.json'), 'utf8'),
        ) as Json;
        const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });

        compiledSchema = ajv.compile(schema);
    }

    if (compiledSchema(collection)) {
        return [];
    }

    return (compiledSchema.errors ?? []).slice(0, 20).map((error) => ({
        severity: 'error' as const,
        code: 'SCHEMA_VIOLATION',
        message: `${label}: ${error.instancePath || '/'} ${error.message ?? ''}`,
    }));
}

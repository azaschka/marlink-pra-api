/* eslint-disable @typescript-eslint/naming-convention -- object keys are HTTP routes, DTO paths and file paths */
import 'reflect-metadata';
import * as path from 'path';
import {
    checkCredentialValues,
    checkFileNames,
    checkRenderedRequests,
    checkVariables,
    readNativeRequests,
    readV21Requests,
    validateV21Schema,
} from '../lib/artifact-checks';
import { buildCollectionModel } from '../lib/collection-builder';
import { DtoAnalyzer } from '../lib/dto-analyzer';
import { SCHEMA_DIRECTORY } from '../lib/generator';
import { Operation } from '../lib/model';
import { BuildContext, OperationBuilder } from '../lib/operation-builder';
import { encodeQueryValue, IdFactory, rawUrl } from '../lib/render-common';
import { extractRoutes } from '../lib/route-extractor';
import { SourceIndex } from '../lib/source-index';
import { renderNativeCollection } from '../lib/v3-writer';
import { renderV21Collection } from '../lib/v21-exporter';
import {
    FIXTURE_CONFIG,
    FIXTURE_GUARD_RULES,
    FIXTURE_INTERCEPTOR_RULES,
    FIXTURE_PIPE_RULES,
    FixtureAppModule,
} from './fixtures';

const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..', '..');

function context(overrides: Partial<BuildContext> = {}): BuildContext {
    const sourceIndex = new SourceIndex(REPOSITORY_ROOT, 'scripts/postman/test');

    return {
        sourceIndex,
        analyzer: new DtoAnalyzer(sourceIndex),
        config: FIXTURE_CONFIG,
        overrides: {},
        fieldExamples: {},
        approvedCustomerOperations: ['GET /things', 'POST /things'],
        excludedCustomerOperations: {},
        excludedCustomerDomains: {},
        excludedCustomerControllers: {},
        internalPathPrefixes: ['/internal-things'],
        guardRules: FIXTURE_GUARD_RULES,
        interceptorRules: FIXTURE_INTERCEPTOR_RULES,
        pipeRules: FIXTURE_PIPE_RULES,
        ...overrides,
    };
}

async function build(overrides: Partial<BuildContext> = {}) {
    const extraction = await extractRoutes(FixtureAppModule);
    const result = await new OperationBuilder(context(overrides)).build(extraction);
    const byKey = new Map(result.operations.map((operation) => [operation.key, operation]));

    return { ...result, extraction, byKey, get: (key: string) => byKey.get(key) as Operation };
}

describe('operation model', () => {
    it('builds one operation per registered route without errors', async () => {
        const { operations, issues } = await build();

        expect(operations).toHaveLength(9);
        expect(issues.filter((issue) => issue.severity === 'error')).toEqual([]);
    });

    it('marks required inputs enabled and optional headers and queries disabled', async () => {
        const list = (await build()).get('GET /things');
        const header = (name: string) => list.headers.find((entry) => entry.name === name);

        // X-Tenant-Id: read by the handler (required) and by the interceptor (optional): the handler wins.
        expect(header('X-Tenant-Id')).toMatchObject({ required: true, value: '{{tenantId}}' });
        expect(header('X-Transaction-Id')).toMatchObject({ required: false, value: '{{transactionId}}' });
        expect(list.queryParams.map((param) => [param.name, param.required])).toEqual([
            ['pageSize', false],
            ['owner_name', true],
            ['tags', false],
        ]);
        expect(rawUrl(list)).toBe('{{baseUrl}}/things?owner_name=Example%20owner%20name');
    });

    it('adds X-Tenant-Id as an optional row where only a scope component reads it', async () => {
        const create = (await build()).get('POST /things');

        expect(create.headers.map((header) => [header.name, header.required])).toEqual([['X-Tenant-Id', false]]);
    });

    it('does not add X-Transaction-Id where nothing reads it', async () => {
        const create = (await build()).get('POST /things');

        expect(create.headers.some((header) => header.name === 'X-Transaction-Id')).toBe(false);
    });

    it('models authentication combinations', async () => {
        const result = await build();

        expect(result.get('GET /things').auth.schemes).toEqual(['accessKey']);
        expect(result.get('GET /public').auth.schemes).toEqual([]);
        expect(result.get('GET /public/hidden').auth.schemes).toEqual(['apiKey']);
        expect(result.get('GET /internal-things/profile').auth.schemes).toEqual(['apiKey', 'jwt']);
        // The second credential of an API key plus JWT route is an explicit header row.
        expect(result.get('GET /internal-things/profile').headers[0]).toMatchObject({
            name: 'X-API-Key',
            value: '{{apiKey}}',
            required: true,
        });
        expect(result.get('GET /public').discrepancies.join(' ')).toContain('No authentication guard');
        expect(result.get('GET /public').discrepancies.join(' ')).toContain('Nest keeps only one request method');
    });

    it('produces minimal and full bodies that pass the route pipes', async () => {
        const create = (await build()).get('POST /things');

        expect(create.body?.minimal).toEqual({ name: 'Example name', addresses: [{ street: 'example-street' }] });
        expect(create.body?.full).toEqual({
            name: 'Example name',
            colour: 'blue',
            addresses: [{ street: 'example-street', number: 1 }],
            contactEmail: 'user@example.com',
            notify: false,
        });
        expect(create.discrepancies.join(' ')).toContain('CreateThingDtoInput.comment is declared without decorators');
    });

    it('sends one field when a PATCH body must not be empty', async () => {
        const modify = (await build()).get('PATCH /things/:id');

        expect(modify.body?.nonEmptyRequired).toBe(true);
        expect(modify.body?.minimal).toEqual({ name: 'Example name' });
        expect(modify.body?.notes.join(' ')).toContain('an empty object is rejected');
    });

    it('reports an invalid override body instead of publishing it', async () => {
        const { issues } = await build({ overrides: { 'POST /things': { minimalBody: { name: 42 } } } });

        expect(issues.map((issue) => issue.code)).toContain('INVALID_BODY_EXAMPLE');
    });

    it('reports overrides, field examples and export entries that match no route', async () => {
        const { issues } = await build({
            overrides: { 'GET /gone': { description: 'x' } },
            fieldExamples: { 'GoneDto.value': 1 },
            approvedCustomerOperations: ['GET /gone'],
        });

        expect(issues.map((issue) => issue.code)).toEqual(
            expect.arrayContaining(['ORPHAN_OVERRIDE', 'ORPHAN_FIELD_EXAMPLE', 'ORPHAN_EXPORT_DECISION']),
        );
    });

    it('fails on unclassified guards and unexplained raw request access', async () => {
        const { issues } = await build({
            guardRules: {},
            config: { ...FIXTURE_CONFIG, requestObjectUsages: {} },
        });
        const codes = issues.map((issue) => issue.code);

        expect(codes).toContain('UNCLASSIFIED_COMPONENT');
        expect(codes).toContain('UNEXPLAINED_REQUEST_OBJECT');
    });

    it('decides the customer export from effective auth, internal paths and the approved list', async () => {
        const result = await build();

        expect(result.get('GET /things').customerExport.status).toBe('included');
        expect(result.get('PATCH /things/:id').customerExport.status).toBe('pending-decision');
        expect(result.get('GET /public/hidden').customerExport).toMatchObject({ status: 'excluded-policy' });
        expect(result.get('GET /internal-things/profile').customerExport.status).toBe('excluded-policy');
    });

    it('excludes whole domain folders and controllers from the customer export', async () => {
        const result = await build({
            approvedCustomerOperations: ['GET /things'],
            excludedCustomerDomains: { Public: 'console only.' },
            excludedCustomerControllers: { ThingController: 'not for customers.' },
        });

        expect(result.get('GET /public').customerExport).toEqual({
            status: 'excluded-policy',
            reason: 'Folder Public: console only.',
        });
        expect(result.get('POST /things').customerExport.reason).toBe('ThingController: not for customers.');
        // Approving an excluded operation contradicts the policy and stops the run.
        expect(result.issues.map((issue) => [issue.code, issue.operation])).toContainEqual([
            'CONFLICTING_EXPORT_DECISION',
            'GET /things',
        ]);
    });

    it('reports excluded folders and controllers that do not exist', async () => {
        const { issues } = await build({
            excludedCustomerDomains: { Gone: 'x' },
            excludedCustomerControllers: { GoneController: 'x' },
        });

        expect(issues.filter((issue) => issue.code === 'ORPHAN_EXPORT_DECISION')).toHaveLength(2);
    });

    it('names path variables after the resource instead of a generic id', async () => {
        const modify = (await build()).get('PATCH /things/:id');

        expect(modify.pathParams[0]).toMatchObject({ name: 'id', value: '{{thingId}}', variable: 'thingId' });
    });
});

describe('rendering and export', () => {
    async function render() {
        const { operations, pathVariables } = await build();
        const ids = new IdFactory(FIXTURE_CONFIG.idNamespace);
        const internal = buildCollectionModel(operations, '9.9.9', pathVariables, 'internal', FIXTURE_CONFIG);
        const customerOperations = operations.filter((operation) => operation.customerExport.status === 'included');
        const customer = buildCollectionModel(customerOperations, '9.9.9', pathVariables, 'customer', FIXTURE_CONFIG);

        return {
            operations,
            customerOperations,
            internal,
            customer,
            native: renderNativeCollection(internal, ids),
            internalJson: renderV21Collection(internal, ids, ids.id('collection:internal')),
            customerJson: renderV21Collection(customer, ids, ids.id('collection:customer')),
        };
    }

    it('nests domain and controller folders recursively in the v2.1 export', async () => {
        const { internalJson } = await render();
        const things = (internalJson.item as Array<Record<string, unknown>>)[0] as Record<string, unknown>;
        const controller = (things.item as Array<Record<string, unknown>>)[0] as Record<string, unknown>;

        expect(things.name).toBe('Things');
        expect(controller.name).toBe('ThingController');
        expect((controller.item as unknown[]).length).toBe(6);
        expect(readV21Requests(internalJson)).toHaveLength(9);
    });

    it('keeps descriptions, auth, variables and the full-body example in the export', async () => {
        const { internalJson } = await render();
        const json = JSON.stringify(internalJson);
        const requests = readV21Requests(internalJson);

        expect(internalJson.auth).toMatchObject({ type: 'apikey' });
        expect((internalJson.variable as Array<{ key: string }>).map((variable) => variable.key)).toEqual(
            expect.arrayContaining([
                'baseUrl',
                'accessKey',
                'apiKey',
                'jwtToken',
                'tenantId',
                'transactionId',
                'thingId',
            ]),
        );
        expect(json).toContain('"name":"Full body"');
        expect(json).toContain('"type":"noauth"');
        expect(json).toContain('"type":"bearer"');
        expect(requests.find((request) => request.method === 'POST')?.body).toContain('"addresses"');
    });

    it('validates against the official Collection v2.1 schema and rejects a broken document', async () => {
        const { internalJson, customerJson } = await render();

        expect(validateV21Schema('internal', internalJson, SCHEMA_DIRECTORY)).toEqual([]);
        expect(validateV21Schema('customer', customerJson, SCHEMA_DIRECTORY)).toEqual([]);
        expect(
            validateV21Schema('broken', { info: { name: 'x' }, item: 'nope' }, SCHEMA_DIRECTORY).length,
        ).toBeGreaterThan(0);
    });

    it('filters the customer export to approved operations and prunes internal variables', async () => {
        const { customerJson, customerOperations } = await render();
        const keys = readV21Requests(customerJson).map((request) => `${request.method} ${request.rawUrl}`);

        expect(customerOperations.map((operation) => operation.key)).toEqual(['GET /things', 'POST /things']);
        expect(keys).toHaveLength(2);
        expect((customerJson.variable as Array<{ key: string }>).map((variable) => variable.key)).not.toContain(
            'apiKey',
        );
        expect(readV21Requests(customerJson).flatMap((request) => request.headers.map((row) => row.key))).not.toContain(
            'X-API-Key',
        );
        expect(JSON.stringify(customerJson)).not.toContain('"value":"X-API-Key"');
    });

    it('passes the independent artifact checks for both formats', async () => {
        const { native, internalJson, customerJson, operations, customerOperations, internal } = await render();
        const allKeys = new Set(operations.map((operation) => operation.key));
        const variables = new Map(internal.variables.map((variable) => [variable.key, variable.description]));

        expect(
            checkRenderedRequests(readNativeRequests(native), {
                label: 'native',
                operations,
                variables,
                expectedKeys: allKeys,
            }),
        ).toEqual([]);
        expect(
            checkRenderedRequests(readV21Requests(internalJson), {
                label: 'internal',
                operations,
                variables,
                expectedKeys: allKeys,
            }),
        ).toEqual([]);
        expect(
            checkRenderedRequests(readV21Requests(customerJson), {
                label: 'customer',
                operations,
                variables,
                expectedKeys: new Set(customerOperations.map((operation) => operation.key)),
            }),
        ).toEqual([]);
        expect(
            checkVariables('native', [...native.values()].join('\n'), new Set(internal.variables.map((v) => v.key))),
        ).toEqual([]);
        expect(checkFileNames(native.keys())).toEqual([]);
        expect(checkCredentialValues('internal', internal.variables)).toEqual([]);
    });

    it('detects wrong optional flags, orphans, missing requests, unresolved variables and embedded credentials', async () => {
        const { internalJson, operations, internal } = await render();
        const requests = readV21Requests(internalJson);
        const list = requests.find((request) =>
            request.rawUrl.startsWith('{{baseUrl}}/things?'),
        ) as (typeof requests)[number];
        const tampered = [
            ...requests.filter((request) => request !== list),
            {
                ...list,
                headers: list.headers.map((row) => ({
                    ...row,
                    disabled: false,
                    value: row.key === 'X-Tenant-Id' ? '7' : row.value,
                })),
            },
            { ...list, source: 'orphan', rawUrl: '{{baseUrl}}/nowhere', queries: [], headers: [], pathVariables: [] },
        ].filter((request) => !request.rawUrl.startsWith('{{baseUrl}}/public/hidden'));
        const codes = checkRenderedRequests(tampered, {
            label: 'tampered',
            operations,
            variables: new Map(),
            expectedKeys: new Set(operations.map((operation) => operation.key)),
        }).map((issue) => issue.code);

        expect(codes).toEqual(expect.arrayContaining(['WRONG_OPTIONAL_FLAG', 'ORPHAN_REQUEST', 'MISSING_REQUEST']));
        expect(
            checkVariables('x', '{{baseUrl}} {{unknownId}} {{$guid}}', new Set(['baseUrl'])).map(
                (issue) => issue.message,
            ),
        ).toEqual(['x: {{unknownId}} is not defined.']);
        expect(checkCredentialValues('x', [...internal.variables, { key: 'accessKey', value: 'secret' }])).toHaveLength(
            1,
        );
        expect(checkFileNames(['A/b.request.yaml', 'a/B.request.yaml']).map((issue) => issue.code)).toEqual([
            'FILENAME_COLLISION',
        ]);
    });

    it('renders identical, deterministic output on repeated runs', async () => {
        const first = await render();
        const second = await render();

        expect([...second.native.entries()]).toEqual([...first.native.entries()]);
        expect(JSON.stringify(second.internalJson)).toBe(JSON.stringify(first.internalJson));
        expect(JSON.stringify(first.internalJson)).not.toMatch(/"_postman_id":"[0-9a-f-]{36}"[\s\S]*Date|timestamp/);
    });

    it('keeps disabled query parameters out of the raw URL and encodes values', () => {
        expect(encodeQueryValue('a b&c')).toBe('a%20b%26c');
        expect(encodeQueryValue('{{tenantId}}')).toBe('{{tenantId}}');
    });

    it('writes the native layout with request files, folder definitions and examples', async () => {
        const { native } = await render();
        const files = [...native.keys()];

        expect(files).toEqual(
            expect.arrayContaining([
                '.resources/definition.yaml',
                'Things/.resources/definition.yaml',
                'Things/ThingController/.resources/definition.yaml',
                'Things/ThingController/POST things.request.yaml',
                'Things/ThingController/.resources/POST things.resources/examples/Full body.example.yaml',
                'Internal/InternalThingController/GET internal-things profile.request.yaml',
            ]),
        );
        expect(native.get('Things/ThingController/GET things.request.yaml')).toContain('disabled: true');
        expect(native.get('Internal/InternalThingController/.resources/definition.yaml')).toContain('type: bearer');
    });
});

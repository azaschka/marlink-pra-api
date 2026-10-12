import 'reflect-metadata';
import * as path from 'path';
import {
    ApiExcludeController,
    ApiExcludeEndpoint,
    ApiHeader,
    ApiOkResponse,
    ApiParam,
    ApiProperty,
} from '@nestjs/swagger';
import { DtoAnalyzer } from '../lib/dto-analyzer';
import { extractRoutes, joinRoutePath } from '../lib/route-extractor';
import { SourceIndex } from '../lib/source-index';
import { SWAGGER_METADATA } from '../lib/swagger-metadata';
import {
    CreateThingDtoInput,
    FixtureAppModule,
    ModifyThingDtoInput,
    RetrieveThingsDtoInput,
    ThingController,
} from './fixtures';

const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..', '..');

describe('route extraction', () => {
    it('joins controller and handler paths like Nest', () => {
        expect(joinRoutePath('/', '/')).toBe('/');
        expect(joinRoutePath('', 'ping')).toBe('/ping');
        expect(joinRoutePath('discrepancies', '/scan/all')).toBe('/discrepancies/scan/all');
        expect(joinRoutePath('sites/:id/managers', '/')).toBe('/sites/:id/managers');
    });

    it('finds every registered route, including Swagger-excluded, inherited, array and dynamic-module routes', async () => {
        const { routes, controllers } = await extractRoutes(FixtureAppModule);
        const keys = routes.map((route) => `${route.method} ${route.path}`);

        expect(controllers.map((controller) => controller.controllerName)).toEqual([
            'ThingController',
            'InternalThingController',
            'PublicController',
        ]);
        expect(keys).toEqual(
            expect.arrayContaining([
                'GET /things',
                'POST /things',
                'PATCH /things/:id',
                'DELETE /things/:id',
                'DELETE /things/by-name/:name',
                'GET /things/shared',
                'GET /internal-things/profile',
                'GET /public',
                'GET /public/hidden',
            ]),
        );
        expect(keys).toHaveLength(9);
        expect(keys).not.toContain('GET /never-registered');
    });

    it('keeps only one request method per handler, as Nest does', async () => {
        const { routes } = await extractRoutes(FixtureAppModule);

        expect(routes.filter((route) => route.path === '/public').map((route) => route.method)).toEqual(['GET']);
    });

    it('records Swagger exclusion, guards from class and method, and parameter pipes', async () => {
        const { routes } = await extractRoutes(FixtureAppModule);
        const profile = routes.find((route) => route.path === '/internal-things/profile');
        const hidden = routes.find((route) => route.path === '/public/hidden');
        const modify = routes.find((route) => route.method === 'PATCH');

        expect(profile?.swaggerExcludedController).toBe(true);
        expect(profile?.components.filter((c) => c.kind === 'guard').map((c) => c.name)).toEqual([
            'FixtureApiKeyGuard',
            'FixtureJwtGuard',
        ]);
        expect(hidden?.swaggerExcludedEndpoint).toBe(true);
        expect(hidden?.components.map((component) => `${component.scope}:${component.name}`)).toEqual([
            'method:FixtureApiKeyGuard',
        ]);
        expect(modify?.params.find((param) => param.source === 'body')?.pipes.map((pipe) => pipe.name)).toEqual([
            'NonEmptyBodyPipe',
        ]);
        expect(modify?.params.find((param) => param.source === 'path')?.metatype).toBe(Number);
    });

    it('detects custom parameter decorators as custom arguments', async () => {
        const { routes } = await extractRoutes(FixtureAppModule);
        const list = routes.find((route) => route.method === 'GET' && route.path === '/things');

        expect(list?.params.map((param) => param.source)).toEqual(['custom', 'custom', 'query']);
    });
});

describe('Swagger metadata keys', () => {
    it('match the keys written by @nestjs/swagger decorators', () => {
        class Dto {
            @ApiProperty()
            public value!: string;
        }

        @ApiExcludeController()
        @ApiHeader({ name: 'X-Test' })
        class Probe {
            @ApiParam({ name: 'id' })
            @ApiOkResponse({ description: 'ok' })
            @ApiExcludeEndpoint()
            public handler(): void {
                return;
            }
        }

        const handler = Object.getOwnPropertyDescriptor(Probe.prototype, 'handler')?.value as object;

        expect(Reflect.getMetadata(SWAGGER_METADATA.apiModelPropertiesArray, Dto.prototype)).toEqual([':value']);
        expect(Reflect.getMetadata(SWAGGER_METADATA.apiModelProperties, Dto.prototype, 'value')).toBeDefined();
        expect(Reflect.getMetadata(SWAGGER_METADATA.apiExcludeController, Probe)).toEqual([true]);
        expect(Reflect.getMetadata(SWAGGER_METADATA.apiHeaders, Probe)).toHaveLength(1);
        expect(Reflect.getMetadata(SWAGGER_METADATA.apiParameters, handler)).toHaveLength(1);
        expect(Reflect.getMetadata(SWAGGER_METADATA.apiResponse, handler)).toHaveProperty('200');
        expect(Reflect.getMetadata(SWAGGER_METADATA.apiExcludeEndpoint, handler)).toEqual({ disable: true });
    });
});

describe('DTO analysis', () => {
    const analyzer = new DtoAnalyzer(new SourceIndex(REPOSITORY_ROOT, 'scripts/postman/test'));

    it('includes inherited and nested properties with their effective rules', () => {
        const doc = analyzer.analyze(CreateThingDtoInput);
        const byPath = new Map(doc.fields.map((field) => [field.path, field]));

        expect([...byPath.keys()]).toEqual([
            'name',
            'colour',
            'addresses',
            'addresses[].street',
            'addresses[].number',
            'contactEmail',
            'notify',
        ]);
        expect(byPath.get('name')).toMatchObject({
            type: 'string',
            required: 'required',
            constraints: ['max length 20'],
        });
        expect(byPath.get('addresses')).toMatchObject({ type: 'array<object>', required: 'required', isArray: true });
        expect(byPath.get('addresses[].number')).toMatchObject({
            type: 'integer',
            required: 'optional',
            acceptsNull: true,
        });
        expect(byPath.get('contactEmail')).toMatchObject({ format: 'email', required: 'optional' });
        expect(byPath.get('notify')?.required).toBe('conditional');
    });

    it('treats a property with an initialiser as optional and reports the Swagger difference', () => {
        const colour = analyzer.analyze(CreateThingDtoInput).fields.find((field) => field.name === 'colour');

        expect(colour).toMatchObject({ required: 'optional', defaultValue: 'blue', enumValues: ['red', 'blue'] });
        expect(colour?.notes.join(' ')).toContain('Swagger declares required: true');
    });

    it('reports properties declared without decorators', () => {
        expect(analyzer.analyze(CreateThingDtoInput).undecoratedProperties).toEqual(['comment']);
    });

    it('applies PartialType: every property becomes optional, validation rules are kept', () => {
        const doc = analyzer.analyze(ModifyThingDtoInput);
        const name = doc.fields.find((field) => field.path === 'name');

        expect(
            doc.fields.filter((field) => !field.path.includes('.')).every((field) => field.required !== 'required'),
        ).toBe(true);
        expect(name?.constraints).toEqual(['max length 20']);
        expect(doc.fields.find((field) => field.path === 'addresses[].street')?.required).toBe('required');
    });

    it('uses exposed wire names, defaults and array item types for query DTOs', () => {
        const doc = analyzer.analyze(RetrieveThingsDtoInput);

        expect(doc.fields.map((field) => [field.name, field.type, field.required])).toEqual([
            ['pageSize', 'integer', 'optional'],
            ['owner_name', 'string', 'required'],
            ['tags', 'array<string>', 'optional'],
        ]);
        expect(doc.fields[0]?.defaultValue).toBe(50);
    });

    it('maps controllers and handlers with several HTTP decorators in the source index', () => {
        const index = new SourceIndex(REPOSITORY_ROOT, 'scripts/postman/test');

        expect(index.findClass(ThingController.name)?.file).toBe('scripts/postman/test/fixtures.ts');
        expect(
            index.findClass('PublicController')?.methods.find((method) => method.name === 'root')?.httpDecorators,
        ).toEqual(['Get', 'Head']);
    });
});

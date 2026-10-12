/* eslint-disable @typescript-eslint/naming-convention -- object keys are HTTP routes, DTO paths and file paths */
import 'reflect-metadata';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { COLLECTION_CONFIG } from '../config/collection.config';
import { checkConsole, exportToConsole } from '../lib/console-sync';
import { GeneratedArtifacts, generateArtifacts } from '../lib/generator';
import { compareWithWorkingTree, hasDrift, writeToWorkingTree } from '../lib/sync';
import { readWorkspaceBinding } from '../lib/workspace-binding';

const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..', '..');
const COLLECTION_DIR = COLLECTION_CONFIG.paths.nativeCollectionDir;

function temporaryDirectory(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'pra-postman-test-'));
}

function write(root: string, file: string, content: string): void {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
}

function artifacts(files: Record<string, string>): GeneratedArtifacts {
    return { files: new Map(Object.entries(files)) } as GeneratedArtifacts;
}

describe('writing to the working tree', () => {
    const generated = {
        [`${COLLECTION_DIR}/.resources/definition.yaml`]: '$kind: collection\n',
        [`${COLLECTION_DIR}/Sites/GET sites.request.yaml`]: '$kind: http-request\n',
        'postman/reports/coverage-summary.md': '# summary\n',
    };

    it('writes new files and leaves an unchanged tree untouched on the next run', () => {
        const root = temporaryDirectory();
        const first = writeToWorkingTree(root, artifacts(generated));
        const mtime = fs.statSync(path.join(root, 'postman/reports/coverage-summary.md')).mtimeMs;
        const second = writeToWorkingTree(root, artifacts(generated));

        expect(first.written).toHaveLength(3);
        expect(second).toEqual({ written: [], deleted: [], unchanged: 3 });
        expect(fs.statSync(path.join(root, 'postman/reports/coverage-summary.md')).mtimeMs).toBe(mtime);
        expect(hasDrift(compareWithWorkingTree(root, artifacts(generated)))).toBe(false);
    });

    it('removes stale generated requests and the legacy collection, including Finder metadata', () => {
        const root = temporaryDirectory();

        write(root, `${COLLECTION_DIR}/Old/GET old.request.yaml`, 'stale');
        write(root, `${COLLECTION_DIR}/Old/.DS_Store`, 'meta');
        write(root, 'postman/collections/Marlink PRA API v3.1.0/access/Create Access.request.yaml', 'legacy');
        write(root, 'postman/collections/Marlink PRA API v3.1.0/.DS_Store', 'meta');
        write(root, 'postman/exports/Marlink PRA API v3.1.0.postman.collection.json', '{}');

        const drift = compareWithWorkingTree(root, artifacts(generated));

        expect(drift.unexpected).toEqual([`${COLLECTION_DIR}/Old/GET old.request.yaml`]);
        expect(drift.legacy).toHaveLength(2);

        const result = writeToWorkingTree(root, artifacts(generated));

        expect(result.deleted).toEqual(
            expect.arrayContaining([
                `${COLLECTION_DIR}/Old/GET old.request.yaml`,
                'postman/exports/Marlink PRA API v3.1.0.postman.collection.json',
            ]),
        );
        expect(fs.existsSync(path.join(root, `${COLLECTION_DIR}/Old`))).toBe(false);
        expect(fs.existsSync(path.join(root, 'postman/collections/Marlink PRA API v3.1.0'))).toBe(false);
        expect(hasDrift(compareWithWorkingTree(root, artifacts(generated)))).toBe(false);
    });

    it('refuses to delete a file the generator does not own and changes nothing', () => {
        const root = temporaryDirectory();

        write(root, `${COLLECTION_DIR}/Sites/notes.md`, 'hand-written');

        expect(() => writeToWorkingTree(root, artifacts(generated))).toThrow(/does not own/);
        expect(fs.existsSync(path.join(root, `${COLLECTION_DIR}/Sites/notes.md`))).toBe(true);
        expect(fs.existsSync(path.join(root, 'postman/reports/coverage-summary.md'))).toBe(false);
    });

    it('reports changed files in check mode', () => {
        const root = temporaryDirectory();

        writeToWorkingTree(root, artifacts(generated));
        write(root, 'postman/reports/coverage-summary.md', '# edited by hand\n');

        expect(compareWithWorkingTree(root, artifacts(generated)).changed).toEqual([
            'postman/reports/coverage-summary.md',
        ]);
    });
});

describe('Postman workspace binding', () => {
    const bindingFile = '.postman/resources.yaml';

    function bindingRoot(content: string): string {
        const root = temporaryDirectory();

        write(root, bindingFile, content);
        write(root, `${COLLECTION_DIR}/.resources/definition.yaml`, '$kind: collection\n');

        return root;
    }

    const valid = [
        'workspace:',
        '  id: 1d69719d-3d44-4647-91ff-f913df1ee553',
        'cloudResources:',
        '  collections:',
        `    ../${COLLECTION_DIR}: 11321463-ed8ef1d3-324b-4b3e-810a-e2e0070732e6`,
        'localResources:',
        '  collections:',
        `    - ../${COLLECTION_DIR}`,
        '',
    ].join('\n');

    it('returns the bound cloud collection', () => {
        const binding = readWorkspaceBinding(bindingRoot(valid), bindingFile, COLLECTION_DIR, []);

        expect(binding).toMatchObject({
            cloudCollectionUid: '11321463-ed8ef1d3-324b-4b3e-810a-e2e0070732e6',
            cloudCollectionId: 'ed8ef1d3-324b-4b3e-810a-e2e0070732e6',
            issues: [],
        });
    });

    it('reports a damaged file, a missing binding and stale paths', () => {
        const damaged = readWorkspaceBinding(bindingRoot(`${valid}LE.md\n`), bindingFile, COLLECTION_DIR, []);
        const renamed = readWorkspaceBinding(
            bindingRoot(valid.replace(/Marlink PRA API/g, 'Marlink PRA API v3.1.0')),
            bindingFile,
            COLLECTION_DIR,
            ['postman/collections/Marlink PRA API v3.1.0'],
        );

        expect(damaged.issues.map((issue) => issue.code)).toEqual(['WORKSPACE_BINDING_INVALID']);
        expect(renamed.issues.map((issue) => issue.code)).toEqual(
            expect.arrayContaining(['WORKSPACE_BINDING_MISSING', 'WORKSPACE_BINDING_STALE']),
        );
    });

    it('is optional: without the file there is nothing to check', () => {
        expect(readWorkspaceBinding(temporaryDirectory(), bindingFile, COLLECTION_DIR, [])).toEqual({ issues: [] });
    });
});

describe('Console download', () => {
    const exportText = '{"info":{"name":"customer"}}\n';

    function consoleCheckout(references: string): string {
        const root = temporaryDirectory();

        write(root, 'package.json', '{}');
        write(root, COLLECTION_CONFIG.console.referenceFiles[0] as string, references);
        write(root, COLLECTION_CONFIG.console.referenceFiles[1] as string, '<a></a>');
        write(root, COLLECTION_CONFIG.console.legacyAssetPaths[0] as string, '{}');

        return root;
    }

    const goodReferences = `state: '/assets/docs/${COLLECTION_CONFIG.console.downloadFileName}', name: '${COLLECTION_CONFIG.console.downloadFileName}'`;

    it('copies the customer export, removes the legacy asset and then matches byte for byte', () => {
        const root = consoleCheckout(goodReferences);

        expect(checkConsole(root, exportText).issues.map((issue) => issue.code)).toEqual(
            expect.arrayContaining(['CONSOLE_ASSET_MISSING', 'CONSOLE_LEGACY_ASSET']),
        );

        exportToConsole(root, exportText);

        const status = checkConsole(root, exportText);

        expect(status).toMatchObject({ found: true, assetMatches: true, issues: [] });
        expect(fs.readFileSync(path.join(root, COLLECTION_CONFIG.console.assetPath), 'utf8')).toBe(exportText);
    });

    it('detects drift and references that do not point to the asset', () => {
        const root = consoleCheckout("state: '/assets/docs/Marlink PRA API v3.1.0.postman_collection.json'");

        exportToConsole(root, exportText);
        write(root, COLLECTION_CONFIG.console.assetPath, '{"edited":true}');

        expect(checkConsole(root, exportText).issues.map((issue) => issue.code)).toEqual(
            expect.arrayContaining(['CONSOLE_ASSET_DRIFT', 'CONSOLE_REFERENCE_MISSING', 'CONSOLE_LEGACY_REFERENCE']),
        );
    });

    it('skips the check when no Console checkout exists', () => {
        expect(checkConsole(temporaryDirectory(), exportText)).toMatchObject({ found: false, issues: [] });
    });
});

describe('generation from the real PRA API module graph', () => {
    let first: GeneratedArtifacts;

    beforeAll(async () => {
        first = await generateArtifacts({ repositoryRoot: REPOSITORY_ROOT });
    });

    it('produces valid artifacts without errors', () => {
        expect(first.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
    });

    it('keeps the native collection bound to its Postman cloud collection', () => {
        const definition = first.nativeFiles.get('.resources/definition.yaml') ?? '';

        expect(definition).toContain('id: ed8ef1d3-324b-4b3e-810a-e2e0070732e6');
        expect(
            [...first.nativeFiles.entries()]
                .filter(([file]) => file.endsWith('.example.yaml'))
                .every(([, content]) => /^id: /m.test(content)),
        ).toBe(true);
    });

    it('covers every registered route, including operations hidden from Swagger', () => {
        const keys = new Set(first.operations.map((operation) => operation.key));

        expect(first.operations).toHaveLength(first.extraction.routes.length);
        for (const key of [
            'GET /access',
            'POST /auth/login',
            'GET /pra-users',
            'POST /maintenance/reset-data',
            'DELETE /logs/purge',
            'GET /health/live',
            'GET /soc/jump-items',
            'POST /deployments/jumpoint-nodes/deploy',
        ]) {
            expect(keys).toContain(key);
        }
    });

    it('never enables X-Transaction-Id and never defaults the tenant', () => {
        const rows = first.operations.flatMap((operation) => operation.headers);

        expect(rows.filter((row) => row.name === 'X-Transaction-Id').every((row) => !row.required)).toBe(true);
        expect(rows.filter((row) => row.name === 'X-Tenant-Id').every((row) => row.value === '{{tenantId}}')).toBe(
            true,
        );
        expect(first.files.get(COLLECTION_CONFIG.paths.internalExport)).toContain(
            '"key": "tenantId",\n            "value": ""',
        );
    });

    it('keeps internal operations out of the customer export', () => {
        const included = first.operations.filter((operation) => operation.customerExport.status === 'included');

        expect(included.some((operation) => operation.auth.schemes.includes('apiKey'))).toBe(false);
        expect(included.some((operation) => operation.path.startsWith('/access'))).toBe(false);
        expect(
            included.filter((operation) =>
                ['Internal', 'Discrepancies', 'Logs and Monitoring'].includes(operation.domain),
            ),
        ).toEqual([]);
        expect(included.some((operation) => operation.controllerName === 'AppController')).toBe(false);
        expect(first.operations.filter((operation) => operation.customerExport.status === 'pending-decision')).toEqual(
            [],
        );
        expect(first.customerExportText).toBe(first.files.get(COLLECTION_CONFIG.paths.customerExport));
    });

    it('derives the name and version from package.json and honours a release override', async () => {
        const packageVersion = (
            JSON.parse(fs.readFileSync(path.join(REPOSITORY_ROOT, 'package.json'), 'utf8')) as { version: string }
        ).version;
        const override = await generateArtifacts({ repositoryRoot: REPOSITORY_ROOT, releaseVersion: '9.9.9' });

        expect(first.collectionName).toBe(`Marlink PRA API v${packageVersion}`);
        expect(override.collectionName).toBe('Marlink PRA API v9.9.9');
    });

    it('is deterministic: a second generation yields identical files', async () => {
        const second = await generateArtifacts({ repositoryRoot: REPOSITORY_ROOT });

        expect([...second.files.keys()]).toEqual([...first.files.keys()]);
        for (const [file, content] of first.files) {
            expect(second.files.get(file)).toBe(content);
        }
    });
});

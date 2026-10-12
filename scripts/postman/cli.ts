import 'reflect-metadata';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadConfig, register } from 'tsconfig-paths';
import { COLLECTION_CONFIG } from './config/collection.config';
import { checkConsole, exportToConsole, resolveConsoleDir } from './lib/console-sync';
import { GeneratedArtifacts, generateArtifacts } from './lib/generator';
import { CoverageManifest, diffManifests } from './lib/manifest';
import { Issue } from './lib/model';
import { compareWithWorkingTree, hasDrift, stageArtifacts, writeToWorkingTree } from './lib/sync';

/**
 * PRA API Postman collection tooling. Run through the npm scripts in package.json:
 *
 *   npm run postman:generate         regenerate collection, exports and coverage report (validated first)
 *   npm run postman:check            non-writing; fails on drift, coverage gaps or invalid artifacts
 *   npm run postman:export:console   copy the customer export into ../pra-console and verify the references
 *   npm run postman:lint             optional: Postman CLI lint of the staged artifacts (downloads postman-cli)
 *
 * Options: --release-version <x.y.z> overrides the package.json version, --console-dir <path> locates pra-console.
 */

const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..');
const POSTMAN_CLI_PACKAGE = 'postman-cli@1.73.0';

interface CliOptions {
    command: string;
    releaseVersion?: string;
    consoleDir?: string;
}

function parseArguments(argv: string[]): CliOptions {
    const [command = 'help', ...rest] = argv;
    const options: CliOptions = { command };

    for (let index = 0; index < rest.length; index += 1) {
        const argument = rest[index];
        const value = rest[index + 1];

        if (argument === '--release-version' && value) {
            options.releaseVersion = value;
            index += 1;
        } else if (argument === '--console-dir' && value) {
            options.consoleDir = value;
            index += 1;
        } else {
            throw new Error(`Unknown argument: ${argument ?? ''}`);
        }
    }

    return options;
}

function registerSourcePaths(): void {
    // The application imports modules relative to the tsconfig baseUrl (for example 'src/auth/enums').
    const loaded = loadConfig(REPOSITORY_ROOT);

    if (loaded.resultType === 'success') {
        register({ baseUrl: loaded.absoluteBaseUrl, paths: loaded.paths, addMatchAll: true });
    }
}

function printIssues(issues: Issue[]): void {
    for (const severity of ['error', 'warning'] as const) {
        const selected = issues.filter((issue) => issue.severity === severity);

        if (selected.length > 0) {
            console.log(`\n${severity === 'error' ? 'Errors' : 'Warnings'} (${selected.length}):`);
            for (const issue of selected) {
                console.log(`  [${issue.code}] ${issue.message}`);
            }
        }
    }
}

function printSummary(artifacts: GeneratedArtifacts): void {
    const s = artifacts.manifest.summary;

    console.log(`${artifacts.collectionName}`);
    console.log(
        `  routes ${s.registeredRoutes} | operations ${s.operations} | controllers ${s.controllersWithRoutes}/${s.registeredControllers} | hidden from Swagger ${s.swaggerExcludedOperations}`,
    );
    console.log(
        `  customer export: included ${s.customerExport.included}, excluded by policy ${s.customerExport.excludedByPolicy}, pending decision ${s.customerExport.pendingDecision}`,
    );
}

function readPreviousManifest(): CoverageManifest | undefined {
    const file = path.join(REPOSITORY_ROOT, COLLECTION_CONFIG.paths.coverageManifest);

    return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as CoverageManifest) : undefined;
}

function printManifestDiff(previous: CoverageManifest | undefined, next: CoverageManifest): void {
    const diff = diffManifests(previous, next);

    if (diff.added.length + diff.removed.length + diff.changed.length === 0) {
        console.log('  operations: no change against the previous manifest');
        return;
    }

    for (const [label, keys] of [
        ['added', diff.added],
        ['removed', diff.removed],
        ['updated', diff.changed],
    ] as const) {
        if (keys.length > 0) {
            const shown = keys.slice(0, 15).join(', ');
            const more = keys.length > 15 ? ` and ${keys.length - 15} more (see the manifest diff)` : '';

            console.log(`  ${label} (${keys.length}): ${shown}${more}`);
        }
    }
}

function runPostmanCli(args: string[]): number {
    const result = spawnSync('npm', ['exec', '--yes', `--package=${POSTMAN_CLI_PACKAGE}`, '--', 'postman', ...args], {
        cwd: REPOSITORY_ROOT,
        stdio: 'inherit',
        // postman-cli's install script edits AI agent instruction files in the home directory; skip it.
        // eslint-disable-next-line @typescript-eslint/naming-convention -- npm configuration variable
        env: { ...process.env, npm_config_ignore_scripts: 'true' },
    });

    return result.status ?? 1;
}

async function main(): Promise<number> {
    const options = parseArguments(process.argv.slice(2));

    if (!['generate', 'check', 'export-console', 'lint'].includes(options.command)) {
        console.log(
            'Usage: cli.ts <generate|check|export-console|lint> [--release-version x.y.z] [--console-dir path]',
        );
        return options.command === 'help' ? 0 : 1;
    }

    registerSourcePaths();

    const artifacts = await generateArtifacts({
        repositoryRoot: REPOSITORY_ROOT,
        releaseVersion: options.releaseVersion,
    });
    const errors = artifacts.issues.filter((issue) => issue.severity === 'error');
    const consoleDir = resolveConsoleDir(REPOSITORY_ROOT, options.consoleDir);

    printSummary(artifacts);
    printIssues(artifacts.issues);

    if (errors.length > 0) {
        console.log('\nArtifacts are invalid; nothing was written.');
        return 1;
    }

    if (options.command === 'generate') {
        // Every artifact was rendered and validated in memory above; the working tree is touched only now.
        const previous = readPreviousManifest();
        const result = writeToWorkingTree(REPOSITORY_ROOT, artifacts);

        printManifestDiff(previous, artifacts.manifest);
        console.log(
            `  files written ${result.written.length}, deleted ${result.deleted.length}, unchanged ${result.unchanged}`,
        );

        const consoleStatus = checkConsole(consoleDir, artifacts.customerExportText);

        if (consoleStatus.found && !consoleStatus.assetMatches) {
            console.log('  Console asset differs from the customer export: run npm run postman:export:console.');
        }

        return 0;
    }

    if (options.command === 'check') {
        const drift = compareWithWorkingTree(REPOSITORY_ROOT, artifacts);
        const consoleStatus = checkConsole(consoleDir, artifacts.customerExportText);
        let failed = false;

        if (hasDrift(drift)) {
            failed = true;
            console.log('\nDrift between code and the checked-in artifacts (run npm run postman:generate):');
            for (const [label, files] of Object.entries(drift)) {
                for (const file of files as string[]) {
                    console.log(`  ${label}: ${file}`);
                }
            }
        }

        if (!consoleStatus.found) {
            console.log(`\nConsole check skipped: no pra-console checkout at ${consoleDir} (use --console-dir).`);
        } else if (consoleStatus.issues.length > 0) {
            failed = true;
            printIssues(consoleStatus.issues);
        } else {
            console.log('  Console asset matches the customer export and the download references point to it.');
        }

        console.log(failed ? '\nCheck failed.' : '\nCheck passed: artifacts are complete, valid and up to date.');

        return failed ? 1 : 0;
    }

    if (options.command === 'export-console') {
        const changed = exportToConsole(consoleDir, artifacts.customerExportText);
        const status = checkConsole(consoleDir, artifacts.customerExportText);

        console.log(
            changed.length ? `  Console updated: ${changed.join(', ')}` : '  Console asset already up to date.',
        );
        printIssues(status.issues);

        return status.issues.length > 0 ? 1 : 0;
    }

    // lint: Postman CLI on the staged native collection and on both exports migrated to the native format.
    const staging = stageArtifacts(artifacts);
    const migrated = fs.mkdtempSync(path.join(os.tmpdir(), 'pra-postman-migrated-'));
    let status = runPostmanCli([
        'collection',
        'lint',
        path.join(staging, COLLECTION_CONFIG.paths.nativeCollectionDir),
        '-f',
        'warning',
    ]);

    // Each step runs only when the previous ones succeeded (status stays 0).
    for (const exportPath of [COLLECTION_CONFIG.paths.internalExport, COLLECTION_CONFIG.paths.customerExport]) {
        const target = path.join(migrated, path.basename(exportPath, '.json'));

        status ||= runPostmanCli(['collection', 'migrate', path.join(staging, exportPath), '-o', target]);
        status ||= runPostmanCli(['collection', 'lint', target, '-f', 'warning']);
    }

    fs.rmSync(staging, { recursive: true, force: true });
    fs.rmSync(migrated, { recursive: true, force: true });
    console.log(status === 0 ? '\nPostman CLI lint passed.' : '\nPostman CLI lint failed.');

    return status;
}

main()
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
        console.error(error instanceof Error ? (process.env.DEBUG ? error.stack : error.message) : error);
        process.exit(1);
    });

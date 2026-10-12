import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { COLLECTION_CONFIG } from '../config/collection.config';
import { GeneratedArtifacts } from './generator';

/**
 * Writes validated artifacts into the working tree, or compares them with it (check mode).
 *
 * Safety rules:
 * - nothing is written unless the in-memory artifacts passed every check,
 * - the artifacts are written to a staging directory first (used by the optional Postman CLI lint),
 * - inside the managed collection directory only files the generator owns are deleted; any other file stops
 *   the run before anything is changed,
 * - unchanged files are not rewritten, so a regeneration without code changes leaves the tree untouched.
 */

const GENERATED_FILE = /(\.request\.yaml|\.example\.yaml|(^|\/)definition\.yaml)$/;
const IGNORABLE_FILE = /(^|\/)\.DS_Store$/;

export interface FileDrift {
    missing: string[];
    changed: string[];
    unexpected: string[];
    legacy: string[];
}

function listFiles(directory: string, base = directory): string[] {
    if (!fs.existsSync(directory)) {
        return [];
    }

    return fs
        .readdirSync(directory, { withFileTypes: true })
        .flatMap((entry) => {
            const fullPath = path.join(directory, entry.name);

            return entry.isDirectory()
                ? listFiles(fullPath, base)
                : [path.relative(base, fullPath).split(path.sep).join('/')];
        })
        .sort();
}

function managedDirectoryFiles(root: string, config: typeof COLLECTION_CONFIG): string[] {
    const directory = path.join(root, config.paths.nativeCollectionDir);

    return listFiles(directory).map((file) => `${config.paths.nativeCollectionDir}/${file}`);
}

function legacyFiles(root: string, legacyPath: string): string[] {
    const fullPath = path.join(root, legacyPath);

    if (!fs.existsSync(fullPath)) {
        return [];
    }

    return fs.statSync(fullPath).isDirectory()
        ? listFiles(fullPath).map((file) => `${legacyPath}/${file}`)
        : [legacyPath];
}

export function compareWithWorkingTree(
    root: string,
    artifacts: GeneratedArtifacts,
    config = COLLECTION_CONFIG,
): FileDrift {
    const drift: FileDrift = { missing: [], changed: [], unexpected: [], legacy: [] };

    for (const [file, content] of artifacts.files) {
        const fullPath = path.join(root, file);

        if (!fs.existsSync(fullPath)) {
            drift.missing.push(file);
        } else if (fs.readFileSync(fullPath, 'utf8') !== content) {
            drift.changed.push(file);
        }
    }

    for (const file of managedDirectoryFiles(root, config)) {
        if (!artifacts.files.has(file) && !IGNORABLE_FILE.test(file)) {
            drift.unexpected.push(file);
        }
    }

    for (const legacyPath of config.paths.legacyPaths) {
        if (fs.existsSync(path.join(root, legacyPath))) {
            drift.legacy.push(legacyPath);
        }
    }

    return drift;
}

export function hasDrift(drift: FileDrift): boolean {
    return drift.missing.length + drift.changed.length + drift.unexpected.length + drift.legacy.length > 0;
}

/** Writes the artifacts to a fresh temporary directory and returns its path. */
export function stageArtifacts(artifacts: GeneratedArtifacts): string {
    const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'pra-postman-'));

    for (const [file, content] of artifacts.files) {
        const target = path.join(staging, file);

        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content, 'utf8');
    }

    return staging;
}

function removeEmptyDirectories(directory: string): void {
    if (!fs.existsSync(directory)) {
        return;
    }

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            removeEmptyDirectories(path.join(directory, entry.name));
        }
    }

    const remaining = fs.readdirSync(directory);

    // A directory that only holds Finder metadata is empty for our purposes.
    if (remaining.every((name) => name === '.DS_Store')) {
        for (const name of remaining) {
            fs.rmSync(path.join(directory, name));
        }

        fs.rmdirSync(directory);
    }
}

export interface WriteResult {
    written: string[];
    deleted: string[];
    unchanged: number;
}

export function writeToWorkingTree(
    root: string,
    artifacts: GeneratedArtifacts,
    config = COLLECTION_CONFIG,
): WriteResult {
    const drift = compareWithWorkingTree(root, artifacts, config);
    const legacy = config.paths.legacyPaths.flatMap((legacyPath) => legacyFiles(root, legacyPath));
    const foreign = [...drift.unexpected, ...legacy].filter(
        (file) => !GENERATED_FILE.test(file) && !IGNORABLE_FILE.test(file) && !config.paths.legacyPaths.includes(file),
    );

    if (foreign.length > 0) {
        throw new Error(
            `Refusing to delete files the generator does not own:\n  ${foreign.join('\n  ')}\nMove them out of the managed directory first.`,
        );
    }

    const result: WriteResult = { written: [], deleted: [], unchanged: 0 };

    for (const file of [...drift.unexpected, ...legacy].filter((entry) => !IGNORABLE_FILE.test(entry))) {
        fs.rmSync(path.join(root, file));
        result.deleted.push(file);
    }

    for (const legacyPath of config.paths.legacyPaths) {
        removeEmptyDirectories(path.join(root, legacyPath));
    }

    removeEmptyDirectories(path.join(root, config.paths.nativeCollectionDir));

    for (const [file, content] of artifacts.files) {
        if (drift.missing.includes(file) || drift.changed.includes(file)) {
            const target = path.join(root, file);

            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, content, 'utf8');
            result.written.push(file);
        } else {
            result.unchanged += 1;
        }
    }

    return result;
}

import * as fs from 'fs';
import * as path from 'path';
import { COLLECTION_CONFIG } from '../config/collection.config';
import { Issue } from './model';

/**
 * Keeps the PRA Console download in line with the customer export generated here.
 *
 * The asset in pra-console is a byte-identical copy; pra-api stays the single source. The command never edits
 * Console source code: when the configured file name changes, the check reports which references to update.
 */

export interface ConsoleStatus {
    consoleDir: string;
    found: boolean;
    assetMatches: boolean;
    issues: Issue[];
}

export function resolveConsoleDir(repositoryRoot: string, override?: string, config = COLLECTION_CONFIG): string {
    return path.resolve(repositoryRoot, override ?? config.console.defaultRepositoryDir);
}

export function checkConsole(
    consoleDir: string,
    customerExportText: string,
    config = COLLECTION_CONFIG,
): ConsoleStatus {
    const issues: Issue[] = [];
    const add = (code: string, message: string) => issues.push({ severity: 'error', code, message });

    if (!fs.existsSync(path.join(consoleDir, 'package.json'))) {
        return { consoleDir, found: false, assetMatches: false, issues };
    }

    const assetPath = path.join(consoleDir, config.console.assetPath);
    const assetMatches = fs.existsSync(assetPath) && fs.readFileSync(assetPath, 'utf8') === customerExportText;

    if (!fs.existsSync(assetPath)) {
        add('CONSOLE_ASSET_MISSING', `${config.console.assetPath} does not exist; run npm run postman:export:console.`);
    } else if (!assetMatches) {
        add(
            'CONSOLE_ASSET_DRIFT',
            `${config.console.assetPath} differs from the customer export; run npm run postman:export:console.`,
        );
    }

    const assetUrl = `/${config.console.assetPath.replace(/^src\//, '')}`;
    const references = config.console.referenceFiles.map((file) => {
        const fullPath = path.join(consoleDir, file);

        return { file, content: fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : undefined };
    });

    for (const reference of references) {
        if (reference.content === undefined) {
            add('CONSOLE_REFERENCE_FILE_MISSING', `${reference.file} does not exist.`);
        }
    }

    const allReferences = references.map((reference) => reference.content ?? '').join('\n');

    if (!allReferences.includes(assetUrl)) {
        add('CONSOLE_REFERENCE_MISSING', `No Console reference to the asset URL ${assetUrl}.`);
    }

    if (!allReferences.includes(`'${config.console.downloadFileName}'`)) {
        add(
            'CONSOLE_REFERENCE_MISSING',
            `No Console reference to the download file name ${config.console.downloadFileName}.`,
        );
    }

    for (const legacy of config.console.legacyAssetPaths) {
        const legacyName = path.basename(legacy);

        if (fs.existsSync(path.join(consoleDir, legacy))) {
            add('CONSOLE_LEGACY_ASSET', `${legacy} still exists; remove it (no reference may point to it).`);
        }

        if (allReferences.includes(legacyName)) {
            add('CONSOLE_LEGACY_REFERENCE', `A Console reference still points to ${legacyName}.`);
        }
    }

    return { consoleDir, found: true, assetMatches, issues };
}

/** Copies the customer export into the Console and removes the legacy asset. */
export function exportToConsole(consoleDir: string, customerExportText: string, config = COLLECTION_CONFIG): string[] {
    if (!fs.existsSync(path.join(consoleDir, 'package.json'))) {
        throw new Error(`No pra-console checkout found at ${consoleDir}; pass --console-dir.`);
    }

    const changed: string[] = [];
    const assetPath = path.join(consoleDir, config.console.assetPath);

    if (!fs.existsSync(assetPath) || fs.readFileSync(assetPath, 'utf8') !== customerExportText) {
        fs.mkdirSync(path.dirname(assetPath), { recursive: true });
        fs.writeFileSync(assetPath, customerExportText, 'utf8');
        changed.push(config.console.assetPath);
    }

    for (const legacy of config.console.legacyAssetPaths) {
        const legacyPath = path.join(consoleDir, legacy);

        if (fs.existsSync(legacyPath)) {
            fs.rmSync(legacyPath);
            changed.push(`${legacy} (removed)`);
        }
    }

    return changed;
}

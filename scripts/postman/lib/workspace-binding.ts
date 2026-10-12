import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { Issue } from './model';

/**
 * Postman Native Git binding (`.postman/resources.yaml`): maps local collection directories to collections in
 * the Postman cloud workspace. `postman workspace push` uses it to update the cloud collection in place.
 *
 * The generated collection must stay bound to its cloud collection, so a renamed directory or a damaged file
 * is reported here instead of failing later during the push.
 */

export interface WorkspaceBinding {
    workspaceId?: string;
    /** `<owner id>-<uuid>` of the cloud collection bound to the native collection directory. */
    cloudCollectionUid?: string;
    /** UUID part of the uid; used as the id of the generated collection. */
    cloudCollectionId?: string;
    issues: Issue[];
}

interface ResourcesFile {
    workspace?: { id?: string };
    cloudResources?: Record<string, Record<string, string> | undefined>;
    localResources?: Record<string, string[] | undefined>;
}

const SUPPORTED_ENTITY_TYPES = new Set(['collections', 'environments', 'specs', 'flows', 'mocks', 'globals']);

export function readWorkspaceBinding(
    repositoryRoot: string,
    bindingFile: string,
    nativeCollectionDir: string,
    legacyPaths: string[],
): WorkspaceBinding {
    const fullPath = path.join(repositoryRoot, bindingFile);
    const issues: Issue[] = [];
    const add = (code: string, message: string) =>
        issues.push({ severity: 'error', code, message: `${bindingFile}: ${message}` });

    if (!fs.existsSync(fullPath)) {
        return { issues };
    }

    let resources: ResourcesFile;

    try {
        resources = (yaml.load(fs.readFileSync(fullPath, 'utf8')) as ResourcesFile | undefined) ?? {};
    } catch (error) {
        add('WORKSPACE_BINDING_INVALID', `not valid YAML (${(error as Error).message.split('\n')[0] ?? ''}).`);

        return { issues };
    }

    // Paths in the file are relative to the .postman directory.
    const baseDirectory = path.dirname(fullPath);
    const expected = path
        .relative(baseDirectory, path.join(repositoryRoot, nativeCollectionDir))
        .split(path.sep)
        .join('/');
    const cloudCollections = resources.cloudResources?.collections ?? {};
    const localCollections = resources.localResources?.collections ?? [];
    const uid = cloudCollections[expected];

    if (!uid) {
        add(
            'WORKSPACE_BINDING_MISSING',
            `no cloud collection is bound to ${expected}; a push would create a new collection.`,
        );
    } else if (!/^\d+-[0-9a-f-]{36}$/.test(uid)) {
        add('WORKSPACE_BINDING_INVALID', `the cloud collection id of ${expected} is not a Postman uid: ${uid}.`);
    }

    if (!localCollections.includes(expected)) {
        add('WORKSPACE_BINDING_MISSING', `${expected} is not listed under localResources.collections.`);
    }

    const referenced = [
        ...Object.entries(resources.cloudResources ?? {})
            .filter(([type]) => SUPPORTED_ENTITY_TYPES.has(type))
            .flatMap(([, entries]) => Object.keys(entries ?? {})),
        ...Object.entries(resources.localResources ?? {})
            .filter(([type]) => SUPPORTED_ENTITY_TYPES.has(type))
            .flatMap(([, entries]) => entries ?? []),
    ];

    for (const entry of [...new Set(referenced)]) {
        const resolved = path.join(baseDirectory, entry);

        if (!fs.existsSync(resolved)) {
            add('WORKSPACE_BINDING_STALE', `${entry} does not exist; remove it or restore the file.`);
        }

        if (legacyPaths.some((legacy) => path.resolve(repositoryRoot, legacy) === path.resolve(resolved))) {
            add('WORKSPACE_BINDING_STALE', `${entry} is a legacy path of the previous collection generation.`);
        }
    }

    return {
        workspaceId: resources.workspace?.id,
        cloudCollectionUid: uid,
        cloudCollectionId: uid?.replace(/^\d+-/, ''),
        issues,
    };
}

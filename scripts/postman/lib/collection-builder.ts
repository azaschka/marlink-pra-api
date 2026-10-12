import { COLLECTION_CONFIG } from '../config/collection.config';
import { authenticationText, cell } from './description-writer';
import { AuthScheme, CollectionModel, FolderModel, Operation, VariableModel } from './model';

/**
 * Arranges operations into domain and controller folders and defines the collection variables and overview.
 */

export type Audience = 'internal' | 'customer';

export const DEFAULT_SCHEMES: AuthScheme[] = ['accessKey'];

export function sameSchemes(a: AuthScheme[] | undefined, b: AuthScheme[] | undefined): boolean {
    if (!a || !b) {
        return a === b;
    }

    return a.length === b.length && a.every((scheme) => b.includes(scheme));
}

const BASE_VARIABLES: Array<Omit<VariableModel, 'value'> & { value?: string; audience: Audience[] }> = [
    {
        key: 'baseUrl',
        description:
            'Scheme, host and optional path prefix in front of the controller paths, without a trailing slash. API host directly: no /api. Through the PRA Console ingress: https://<console-host>/api.',
        secret: false,
        audience: ['internal', 'customer'],
    },
    {
        key: 'accessKey',
        value: '',
        description:
            'Access key sent as X-Access-Key. Secret: set it in a local environment or the Postman Vault, never here.',
        secret: true,
        audience: ['internal', 'customer'],
    },
    {
        key: 'tenantId',
        value: '',
        description:
            'BeyondTrust instance id sent as X-Tenant-Id (GET /beyondtrust-instances). Not a customer id. Intentionally empty, never defaulted.',
        secret: false,
        audience: ['internal', 'customer'],
    },
    {
        key: 'transactionId',
        value: '',
        description: 'Optional correlation id for X-Transaction-Id (disabled rows). The API generates one when absent.',
        secret: false,
        audience: ['internal', 'customer'],
    },
    {
        key: 'apiKey',
        value: '',
        description: 'Static internal API key sent as X-API-Key. Secret: local environment or Postman Vault only.',
        secret: true,
        audience: ['internal'],
    },
    {
        key: 'jwtToken',
        value: '',
        description: 'Bearer token of a PRA Console user from POST /auth/login (accessToken). Secret, short-lived.',
        secret: true,
        audience: ['internal'],
    },
];

export function baseVariables(audience: Audience, baseUrlDefault: string): VariableModel[] {
    return BASE_VARIABLES.filter((variable) => variable.audience.includes(audience)).map((variable) => ({
        key: variable.key,
        value: variable.key === 'baseUrl' ? baseUrlDefault : (variable.value ?? ''),
        description: variable.description,
        secret: variable.secret,
    }));
}

function controllerFolder(controllerName: string, operations: Operation[], order: number): FolderModel {
    const first = operations[0];
    const uniform = operations.every((operation) => sameSchemes(operation.auth.schemes, first?.auth.schemes));
    const auth = uniform && first && !sameSchemes(first.auth.schemes, DEFAULT_SCHEMES) ? first.auth.schemes : undefined;
    const source = first?.sourceFile ? ` Source: \`${first.sourceFile}\`.` : '';
    const authText =
        uniform && first
            ? ` Authentication: ${authenticationText(first.auth.schemes)}`
            : ' Authentication differs per request.';

    return {
        name: controllerName,
        description: `Operations of \`${controllerName}\` (module \`${first?.moduleName ?? ''}\`).${source}${authText}`,
        order,
        auth,
        folders: [],
        operations: [...operations].sort((a, b) => a.order - b.order),
    };
}

export function buildFolders(operations: Operation[], config = COLLECTION_CONFIG): FolderModel[] {
    const domainNames = [...config.domains.map((domain) => domain.name), 'Unassigned'];
    const folders: FolderModel[] = [];

    domainNames.forEach((domainName, domainIndex) => {
        const domainOperations = operations.filter((operation) => operation.domain === domainName);

        if (domainOperations.length === 0) {
            return;
        }

        const configured = config.domains.find((domain) => domain.name === domainName);
        const controllerNames = [
            ...(configured?.controllers ?? []),
            ...[...new Set(domainOperations.map((operation) => operation.controllerName))].sort(),
        ].filter((name, index, all) => all.indexOf(name) === index);
        const controllers = controllerNames
            .map((name, index) =>
                controllerFolder(
                    name,
                    domainOperations.filter((operation) => operation.controllerName === name),
                    (index + 1) * 1000,
                ),
            )
            .filter((folder) => folder.operations.length > 0);

        folders.push({
            name: domainName,
            description: configured?.description ?? 'Controllers without a configured domain folder.',
            order: (domainIndex + 1) * 1000,
            folders: controllers,
            operations: [],
        });
    });

    return folders;
}

export function collectionName(version: string, config = COLLECTION_CONFIG): string {
    return `${config.collectionBaseName} v${version}`;
}

export function overview(
    model: Omit<CollectionModel, 'description'>,
    audience: Audience,
    operationCount: number,
    controllerCount: number,
): string {
    const internal = audience === 'internal';
    const lines = [
        `# ${model.name}`,
        '',
        internal
            ? 'Complete internal collection of the PRA API: every registered HTTP route, including operations hidden from Swagger.'
            : 'PRA API collection for customers and operators: every approved operation authenticated with an access key. Internal operations (X-API-Key, access management) are not part of it.',
        '',
        `Generated from the pra-api source code (package version ${model.version}): ${operationCount} operations in ${controllerCount} controllers. Do not edit it by hand; it is regenerated from code at the end of every iteration.`,
        '',
        '## One-time setup',
        '',
        '1. Import this collection. Optionally import the environment template `marlink-pra-api.postman_environment.json` shipped with pra-api.',
        `2. Create an environment (or use the Postman Vault) and set \`baseUrl\`, \`accessKey\` and \`tenantId\`${internal ? ', plus `apiKey` and `jwtToken` for internal operations' : ''}. Keep secrets in the environment or the vault: the collection variables are exported empty on purpose and must never hold credentials.`,
        '3. Set the resource id variables (for example `customerId`, `siteId`) when you need them. They are empty on purpose, so that no request addresses an existing resource by accident.',
        '',
        'No access to the Marlink Postman workspace and no Postman API key are needed.',
        '',
        '## Base URL',
        '',
        '`baseUrl` is the scheme, host and optional path prefix in front of the controller paths, without a trailing slash. The API has no global prefix and no URI versioning (`src/main.ts`).',
        '',
        '- Calling the API service directly: use the API host, for example `https://pra-api-pp.cdn-vas.net`. Do not add `/api`.',
        '- Calling through the PRA Console: use `https://<console-host>/api`. The Console forwards `/api` to the API; the OpenAPI document declares this relative server `/api`.',
        '',
        '## Authentication',
        '',
        '- Default: `X-Access-Key: {{accessKey}}`, configured once on the collection (API Key auth) and inherited by the requests.',
        '- Requests without an authentication guard override it with "No Auth".',
        ...(internal
            ? [
                  '- Internal operations use the static `X-API-Key: {{apiKey}}` instead.',
                  '- PRA Console user operations need both: the bearer token (`{{jwtToken}}`, Bearer auth) and the `X-API-Key` header, which is an explicit header row. Get the token with POST /auth/login.',
              ]
            : []),
        '- Credentials are never sent to an endpoint that does not read them.',
        '',
        '## X-Tenant-Id',
        '',
        '`X-Tenant-Id` carries the **BeyondTrust instance id** (see GET /beyondtrust-instances), never a customer id. It is an enabled row where the handler requires it and a disabled row where it only narrows the customer scope. `tenantId` is empty and never defaults to an instance.',
        '',
        '## Request conventions',
        '',
        '- Required path, query and header inputs are enabled. Optional query parameters and headers are included but disabled; enable them when needed.',
        '- `X-Transaction-Id` is optional wherever the API reads it and disabled by default.',
        '- Array query parameters are sent by repeating the key (`?name=a&name=b`).',
        '- Request bodies hold the minimal valid body (required fields). The saved example "Full body" holds every writable field with representative nested objects and arrays.',
        '- JSON body properties cannot be disabled like query or header rows: remove the optional properties you do not want to send. Each request documents its fields (path, type, required, null accepted, rules).',
        '- PATCH requests change only the fields you send; where an empty object is rejected, the minimal body sends one field.',
        '- All example data is synthetic. Examples are validated locally against the DTO validation rules of the API; they were not executed against an environment. The response part of saved examples is illustrative (status code only).',
        '',
        '## Variables',
        '',
        '| Variable | Purpose |',
        '|---|---|',
        ...model.variables.map((variable) => `| \`${variable.key}\` | ${cell(variable.description)} |`),
        '',
        '## Folders',
        '',
        ...model.folders.map((folder) => `- **${folder.name}**: ${folder.description}`),
    ];

    return lines.join('\n');
}

export function buildCollectionModel(
    operations: Operation[],
    version: string,
    pathVariables: Map<string, string>,
    audience: Audience,
    config = COLLECTION_CONFIG,
): CollectionModel {
    const name = collectionName(version, config);
    const used = new Set(operations.flatMap((operation) => operation.pathParams.map((param) => param.variable)));
    const variables = [
        ...baseVariables(audience, config.urlComposition.baseUrlDefault),
        ...[...pathVariables.entries()]
            .filter(([key]) => used.has(key))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, description]) => ({ key, value: '', description, secret: false })),
    ];
    const folders = buildFolders(operations, config);
    const controllerCount = new Set(operations.map((operation) => operation.controllerName)).size;
    const partial = { name, version, variables, folders };

    return { ...partial, description: overview(partial, audience, operations.length, controllerCount) };
}

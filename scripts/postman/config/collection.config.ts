/* eslint-disable @typescript-eslint/naming-convention -- object keys are HTTP routes (`METHOD /path`) */
/**
 * Static configuration of the PRA API Postman collection: names, output paths, folder structure,
 * URL composition, variables and the Console download.
 *
 * Everything that describes the API contract itself (routes, parameters, validation) is read from code.
 * This file only holds decisions that code cannot express.
 */

export interface DomainConfig {
    name: string;
    description: string;
    /** Controller class names in display order. */
    controllers: string[];
}

export const COLLECTION_CONFIG = {
    /** Display name; the version from package.json (or `--release-version`) is appended. */
    collectionBaseName: 'Marlink PRA API',
    /** Fixed namespace for deterministic UUIDs (v5). Never change it: ids stay stable across releases. */
    idNamespace: '11b671c7-2d20-4828-afee-34f62e026891',

    paths: {
        /** Native Postman v3 YAML collection (complete internal collection). Stable across releases. */
        nativeCollectionDir: 'postman/collections/Marlink PRA API',
        internalExport: 'postman/exports/marlink-pra-api-internal.postman_collection.json',
        customerExport: 'postman/exports/marlink-pra-api-customer.postman_collection.json',
        environmentTemplate: 'postman/exports/marlink-pra-api.postman_environment.json',
        coverageManifest: 'postman/reports/coverage-manifest.json',
        coverageSummary: 'postman/reports/coverage-summary.md',
        /** Paths of the previous, hand-maintained generation. Removed by `generate`, reported by `check`. */
        legacyPaths: [
            'postman/collections/Marlink PRA API v3.1.0',
            'postman/exports/Marlink PRA API v3.1.0.postman.collection.json',
        ],
    },

    console: {
        /** Default location of the pra-console checkout relative to pra-api (workspace layout). */
        defaultRepositoryDir: '../pra-console',
        /** Downloadable asset, a byte-identical copy of the customer export. */
        assetPath: 'src/assets/docs/Marlink PRA API.postman_collection.json',
        /** File name offered by the browser download. */
        downloadFileName: 'Marlink PRA API.postman_collection.json',
        /** Files that reference the asset path or the download file name. */
        referenceFiles: [
            'src/app/shared/services/navigation.service.ts',
            'src/app/shared/components/sidenav/sidenav.template.html',
        ],
        /** Previous asset names that must no longer exist or be referenced. */
        legacyAssetPaths: ['src/assets/docs/Marlink PRA API v3.1.0.postman_collection.json'],
    },

    urlComposition: {
        /**
         * Expected global prefix and versioning in src/main.ts. The generator fails when main.ts activates
         * either, so that the URL composition is reviewed instead of silently changing every request.
         */
        globalPrefix: '',
        uriVersioning: false,
        baseUrlDefault: 'https://pra-api-pp.cdn-vas.net',
    },

    /** Swagger servers declared in main.ts that are known and explained in the collection overview. */
    knownOpenApiServers: ['/api'],

    domains: [
        {
            name: 'Customers',
            description: 'Customers (one per business unit and BeyondTrust instance) and their lifecycle.',
            controllers: ['CustomerController'],
        },
        {
            name: 'Sites',
            description: 'Sites of a customer and their manager, auditor, support team and jumpoint assignments.',
            controllers: [
                'SiteController',
                'SiteManagerController',
                'SiteAuditorController',
                'SiteSupportTeamMemberController',
                'SiteJumpointController',
            ],
        },
        {
            name: 'BeyondTrust Instances',
            description: 'Registered BeyondTrust instances (tenants) and their configuration backups.',
            controllers: ['BeyondtrustInstanceController', 'BeyondtrustInstanceBackupController'],
        },
        {
            name: 'Users',
            description: 'BeyondTrust users and their group policy memberships.',
            controllers: ['UserController', 'UserGroupPolicyController'],
        },
        {
            name: 'Teams',
            description: 'BeyondTrust teams and their members.',
            controllers: ['TeamController', 'TeamUserController'],
        },
        {
            name: 'Group Policies',
            description: 'Group policies and their members, teams, jump groups and jumpoints.',
            controllers: [
                'GroupPolicyController',
                'GroupPolicyMemberController',
                'GroupPolicyTeamController',
                'GroupPolicyJumpGroupController',
                'GroupPolicyJumpointController',
            ],
        },
        {
            name: 'Jump Groups',
            description: 'Jump groups.',
            controllers: ['JumpGroupController'],
        },
        {
            name: 'Jump Policies',
            description: 'Jump policies.',
            controllers: ['JumpPolicyController'],
        },
        {
            name: 'Jump Clients',
            description: 'Installed jump clients and jump client installers.',
            controllers: ['JumpClientController', 'JumpClientInstallerController'],
        },
        {
            name: 'Jump Items',
            description: 'Jump items by type: remote RDP, remote VNC, shell jump, web jump and protocol tunnel jump.',
            controllers: [
                'RemoteRdpController',
                'RemoteVncController',
                'ShellJumpController',
                'WebJumpController',
                'ProtocolTunnelJumpController',
            ],
        },
        {
            name: 'Jumpoints',
            description: 'Jumpoints, their nodes and installers.',
            controllers: ['JumpointController', 'JumpointExtensionController'],
        },
        {
            name: 'Session Policies',
            description: 'Session policies (read only).',
            controllers: ['SessionPolicyController'],
        },
        {
            name: 'License Usage',
            description: 'License usage calculation per customer and per site.',
            controllers: ['CustomerLicenseUsageController', 'SiteLicenseUsageController'],
        },
        {
            name: 'SOC',
            description: 'Consolidated projections for the Security Operations Center integration.',
            controllers: ['SocController'],
        },
        {
            name: 'Discrepancies',
            description: 'Discrepancy detection between the platform and BeyondTrust, scans and synchronisation.',
            controllers: ['DiscrepancyScannerController', 'DiscrepancySyncController'],
        },
        {
            name: 'Deployments',
            description: 'Jumpoint node deployments.',
            controllers: ['JumpointNodeController'],
        },
        {
            name: 'Logs and Monitoring',
            description: 'System log and request monitoring records.',
            controllers: ['LogController', 'MonitoringController'],
        },
        {
            name: 'Health and Platform',
            description: 'Liveness, readiness, diagnostics and the root endpoints.',
            controllers: ['HealthController', 'AppController'],
        },
        {
            name: 'Internal',
            description:
                'Operations protected by the static X-API-Key: access management, PRA Console sign-in and users, maintenance. Never part of the customer export.',
            controllers: ['AccessController', 'AuthController', 'PraUserController', 'MaintenanceController'],
        },
    ] satisfies DomainConfig[],

    /** Registered controllers that intentionally have no HTTP routes (scheduled work only). */
    controllersWithoutRoutes: {
        JobController: 'Hosts the scheduled jobs (backups, data population, retention); declares no HTTP route.',
    } as Record<string, string>,

    /**
     * Collection variable for a path parameter, keyed by `<path up to and including the parameter>`.
     * Without an entry, `:id` becomes `<singular of the preceding segment>Id` and other parameters keep their name.
     */
    pathVariableNames: {
        '/jump-clients/installers/:id': 'jumpClientInstallerId',
        '/jump-clients/installers/:installerId': 'jumpClientInstallerId',
        '/pra-users/:id': 'praUserId',
        '/access/:id': 'accessId',
        '/group-policies/:id/members/:memberId': 'groupPolicyMemberId',
        '/sites/:id/managers/:managerId': 'siteManagerId',
        '/sites/:id/auditors/:auditorId': 'siteAuditorId',
        '/sites/:id/support-team-members/:supportTeamMemberId': 'siteSupportTeamMemberId',
        '/discrepancies/scan/status/:scanId': 'discrepancyScanId',
    } as Record<string, string>,

    /** Explanation for every handler that reads the raw request object (`@Req()`). */
    requestObjectUsages: {
        'POST /auth/login':
            'Reads request.user, set by LocalAuthGuard from the username and password in the JSON body.',
        'GET /auth/profile': 'Returns request.user, the claims of the bearer token validated by JwtAuthGuard.',
        'POST /maintenance/reset-data':
            'Reads request.user (bearer token claims) to record who executed the reset; no further request input.',
    } as Record<string, string>,

    /** Responses written directly to the response object (`@Res()`): file downloads. */
    downloadResponses: {
        'GET /beyondtrust-instances/:id/backups/:backupId/content':
            'application/octet-stream (BeyondTrust configuration backup file). Use "Send and Download" in Postman.',
        'GET /jump-clients/installers/:installerId/platforms/:platformType':
            'Installer file streamed from BeyondTrust; Content-Type and Content-Disposition are passed through. Use "Send and Download".',
        'GET /jumpoints/:id/installer':
            'Jumpoint installer streamed from BeyondTrust; Content-Type and Content-Disposition are passed through. Use "Send and Download".',
        'GET /jumpoints/installers':
            'Jumpoint installer of the site streamed from BeyondTrust. Use "Send and Download".',
        'GET /deployments/jumpoint-nodes/:id/iso': 'application/x-iso9660-image (node ISO). Use "Send and Download".',
    } as Record<string, string>,

    /** Health endpoints write their status code through `@Res({ passthrough: true })`. */
    passthroughResponses: {
        'GET /health': '200 when healthy or degraded, 503 when unavailable.',
        'GET /health/ready': '200 when the database is reachable, 503 otherwise.',
        'GET /health/live': '200 while the process answers.',
    } as Record<string, string>,
};

export type CollectionConfig = typeof COLLECTION_CONFIG;

export abstract class DefaultAppConfig {
    private static readonly PORT_NUMBER = 9000;

    private static readonly HEALTH_DISK_STORAGE_USAGE_THRESHOLD_IN_PERCENT = 80;
    private static readonly HEALTH_MEMORY_HEAP_USAGE_THRESHOLD_IN_MB = 512;
    private static readonly HEALTH_PING_CHECK_PRA_SYNC_API_URL = 'http://pra-sync-api:9001/health';
    private static readonly AUTH_FALLBACK_ADMIN_ENABLED = true;
    private static readonly AUTH_FALLBACK_ADMIN_USERNAME = 'odin';
    private static readonly AUTH_FALLBACK_ADMIN_PASSWORD_HASH =
        '$2b$10$rZVykVWWxkZMsp1spQKrNOdkZdFXb7H0BLao5Ue1N4WLqIHmjRIoK';
    private static readonly PRA_ADMIN_CONSOLE_URL = 'https://pra-admin.cdn-vas.net';
    private static readonly BEYOND_TRUST_CONSOLE_URL = 'https://marlinksra.beyondtrustcloud.com/login';
    private static readonly PRA_SYNC_API_BASE_URL = 'http://pra-sync-api:9001';
    // Database connection settings
    // Current baseline: MariaDB default max_connections = 151, wait_timeout / interactive_timeout = 30 s
    private static readonly DB_RETRY_ATTEMPTS = 60;
    private static readonly DB_RETRY_DELAY_IN_MS = 8000; // 8 seconds
    private static readonly DB_MAX_QUERY_EXECUTION_TIME_IN_MS = 15000; // 15 seconds

    // Connection pool — sized for max_connections = 151.
    // pra-api serves short-lived HTTP requests without complex saga burst patterns,
    // so a conservative pool size is sufficient.
    //   Pool(20) + queue(50) = 70 capacity; combined with pra-sync-api(20), total DB usage ≈ 40 ✅
    private static readonly DB_EXTRA_MAX_CONNECTIONS = 20;
    // TODO: After MariaDB upgrade to max_connections = 300 & wait_timeout / interactive_timeout = 300 s,
    //       increase the connection pool accordingly:
    //   Pool(30) + queue(100) = 130 capacity; combined with pra-sync-api(50), total DB usage ≈ 80 ✅
    // private static readonly DB_EXTRA_MAX_CONNECTIONS = 30;

    private static readonly DB_CONNECT_TIMEOUT_IN_MS = 10000; // 10 seconds to establish connection (unchanged for both DB configs)
    private static readonly DB_WAIT_FOR_CONNECTIONS = true; // Wait for available connection (MySQL2 option)

    // Max requests queuing for a free pool slot before failing (MySQL2 option).
    // Prevents "Too many connections" errors during short traffic bursts.
    private static readonly DB_QUEUE_LIMIT = 50;
    // TODO: After MariaDB upgrade to max_connections = 300, increase to match pra-sync-api:
    // private static readonly DB_QUEUE_LIMIT = 100;

    private static readonly CRON_JOB_TIMEZONE = 'Europe/Berlin';
    private static readonly CRON_JOB_BT_INSTANCE_BACKUP = '35 2 * * *'; // At 02:35 AM every day
    private static readonly CRON_JOB_BT_DATA_POPULATION_IF_EMPTY = '0 */3 * * *'; // Every 3 hours
    private static readonly THROTTLE_TTL_IN_MS = 60000; // 1 minute
    private static readonly THROTTLE_LIMIT = 1500; // 1500 requests per TTL
    private static readonly THROTTLE_IS_ENABLED = true;

    public static get port(): number {
        return DefaultAppConfig.PORT_NUMBER;
    }

    public static get health() {
        return {
            diskStorageUsageThresholdInPercent: DefaultAppConfig.HEALTH_DISK_STORAGE_USAGE_THRESHOLD_IN_PERCENT,
            memoryHeapUsageThresholdInMB: DefaultAppConfig.HEALTH_MEMORY_HEAP_USAGE_THRESHOLD_IN_MB,
            pingCheckPraSyncApiUrl: DefaultAppConfig.HEALTH_PING_CHECK_PRA_SYNC_API_URL,
        };
    }

    public static get auth() {
        return {
            fallbackAdminEnabled: DefaultAppConfig.AUTH_FALLBACK_ADMIN_ENABLED,
            fallbackAdminUsername: DefaultAppConfig.AUTH_FALLBACK_ADMIN_USERNAME,
            fallbackAdminPasswordHash: DefaultAppConfig.AUTH_FALLBACK_ADMIN_PASSWORD_HASH,
        };
    }

    public static get praAdminConsole() {
        return {
            consoleUrl: DefaultAppConfig.PRA_ADMIN_CONSOLE_URL,
        };
    }

    public static get beyondTrust() {
        return {
            consoleUrl: DefaultAppConfig.BEYOND_TRUST_CONSOLE_URL,
        };
    }

    public static get praSyncApi() {
        return {
            baseUrl: DefaultAppConfig.PRA_SYNC_API_BASE_URL,
            beyondtrustInstance: {
                path: '/beyondtrust-instances',
                backup: {
                    path: '/backups',
                },
            },
            user: {
                path: '/users',
                groupPolicy: {
                    path: '/group-policies',
                },
            },
            jumpClient: {
                path: '/jump-clients',
                copy: 'copy',
                installer: {
                    path: '/installers',
                    platform: {
                        path: '/platforms',
                    },
                },
            },
            groupPolicy: {
                path: '/group-policies',
                jumpoint: {
                    path: '/jumpoints',
                },
                jumpGroup: {
                    path: '/jump-groups',
                },
                member: {
                    path: '/members',
                },
                team: {
                    path: '/teams',
                },
            },
            team: {
                path: '/teams',
                user: {
                    path: '/users',
                },
            },
            jumpGroup: {
                path: '/jump-groups',
            },
            jumpPolicy: {
                path: '/jump-policies',
            },
            jumpoint: {
                path: '/jumpoints',
                node: {
                    path: '/nodes',
                },
                installer: {
                    path: '/installer',
                },
            },
            jumpItem: {
                remoteRdp: {
                    path: '/jump-items/remote-rdps',
                    copy: 'copy',
                },
                shellJump: {
                    path: '/jump-items/shell-jumps',
                    copy: 'copy',
                },
                webJump: {
                    path: '/jump-items/web-jumps',
                    copy: 'copy',
                },
                remoteVnc: {
                    path: '/jump-items/remote-vncs',
                    copy: 'copy',
                },
                protocolTunnelJump: {
                    path: '/jump-items/protocol-tunnel-jumps',
                    copy: 'copy',
                },
            },
            sessionPolicy: {
                path: '/session-policies',
            },
            deployments: {
                path: '/deployments',
                jumpointNode: {
                    path: '/jumpoint-nodes',
                    approve: 'approve',
                    deploy: 'deploy',
                    services: {
                        path: '/services',
                    },
                    iso: {
                        path: '/iso',
                    },
                },
            },
            discrepancy: {
                path: '/discrepancies',
                scan: {
                    path: '/scan',
                    all: '/all',
                },
                sync: {
                    path: '/sync',
                    allExternal: '/all-external',
                },
            },
        };
    }

    public static get database() {
        return {
            retryAttempts: DefaultAppConfig.DB_RETRY_ATTEMPTS,
            retryDelay: DefaultAppConfig.DB_RETRY_DELAY_IN_MS,
            maxQueryExecutionTime: DefaultAppConfig.DB_MAX_QUERY_EXECUTION_TIME_IN_MS, // Only applicable to MariaDB and MySQL
            connectTimeout: DefaultAppConfig.DB_CONNECT_TIMEOUT_IN_MS,
            queueLimit: DefaultAppConfig.DB_QUEUE_LIMIT,
            waitForConnections: DefaultAppConfig.DB_WAIT_FOR_CONNECTIONS,
            extra: {
                connectionLimit: DefaultAppConfig.DB_EXTRA_MAX_CONNECTIONS,
            },
        };
    }

    public static get site() {
        return {
            groupPolicy: {
                managerPrefix: 'MANAGERS_',
                operatorPrefix: 'OPERATORS_',
                administratorPrefix: 'ADMINISTRATORS_',
                marlink: {
                    superuser: 'MARLINK_SUPERUSERS',
                    operator: 'MARLINK_OPERATORS',
                },
                managerAccess: 'MANAGER_ACCESS',
                administratorAccess: 'ADMINISTRATOR_ACCESS',
                adminOperatorAccess: 'ADMINOPERATOR_ACCESS',
                limitedAccess: 'LIMITED_ACCESS',
                fullAccess: 'FULL_ACCESS',
            },
            user: {
                siteManager: {
                    publicDisplayNamePrefix: 'SITE MANAGER',
                },
                siteAuditor: {
                    publicDisplayNamePrefix: 'AUDITOR',
                },
            },
            jumpPolicy: {
                authSuffix: '_AUTH',
                noAuthSuffix: '_NOAUTH',
                notifySuffix: '_NOTIFY',
                notificationDisplayNamePrefix: 'SITE MANAGER',
                approvalDisplayNamePrefix: 'SITE MANAGER',
            },
            jumpoint: {
                prefix: 'JPOI',
            },
        };
    }

    public static get customer() {
        return {
            groupPolicy: {
                administratorPrefix: 'ADMINISTRATORS_',
            },
        };
    }

    public static get cronJob() {
        return {
            timezone: DefaultAppConfig.CRON_JOB_TIMEZONE,
            retryAttempts: 5,
            retryDelayInMs: 10000,
            btInstanceBackup: DefaultAppConfig.CRON_JOB_BT_INSTANCE_BACKUP,
            btDataPopulationIfEmpty: DefaultAppConfig.CRON_JOB_BT_DATA_POPULATION_IF_EMPTY,
        };
    }

    public static get throttle() {
        return {
            isEnabled: DefaultAppConfig.THROTTLE_IS_ENABLED,
            ttlInMs: DefaultAppConfig.THROTTLE_TTL_IN_MS,
            limit: DefaultAppConfig.THROTTLE_LIMIT,
        };
    }
}

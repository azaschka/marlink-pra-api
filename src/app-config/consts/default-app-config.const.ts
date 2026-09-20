export abstract class DefaultAppConfig {
    private static readonly PORT_NUMBER = 9000;

    private static readonly HEALTH_DISK_STORAGE_USAGE_THRESHOLD_IN_PERCENT = 80;
    private static readonly HEALTH_MEMORY_HEAP_USAGE_THRESHOLD_IN_MB = 512;
    private static readonly HEALTH_PING_CHECK_PRA_SYNC_API_URL = 'http://pra-sync-api:9001/health';
    private static readonly AUTH_FALLBACK_ADMIN_ENABLED = true;
    private static readonly AUTH_FALLBACK_ADMIN_USERNAME = 'odin';
    private static readonly AUTH_FALLBACK_ADMIN_PASSWORD_HASH =
        '$2b$10$rZVykVWWxkZMsp1spQKrNOdkZdFXb7H0BLao5Ue1N4WLqIHmjRIoK';
    private static readonly PRA_ADMIN_CONSOLE_URL = 'https://praadmin-mobsat.msappproxy.net/';
    private static readonly BEYOND_TRUST_CONSOLE_URL = 'https://marlinksra.beyondtrustcloud.com/login';
    private static readonly PRA_SYNC_API_BASE_URL = 'http://pra-sync-api:9001';
    // Database tuning is constant-only; the environment supplies just the endpoint and credentials.
    // Sized for MariaDB max_connections = 300 and wait_timeout = 300 s. Both service pools, counted twice
    // for a rolling update, must stay below max_connections (see the spec).
    private static readonly DB_RETRY_ATTEMPTS = 60;
    private static readonly DB_RETRY_DELAY_IN_MS = 8000; // 8 seconds
    private static readonly DB_MAX_QUERY_EXECUTION_TIME_IN_MS = 15000; // 15 seconds
    private static readonly DB_EXTRA_MAX_CONNECTIONS = 30;
    // Must stay below DB_EXTRA_MAX_CONNECTIONS, otherwise mysql2 never retires idle connections.
    private static readonly DB_POOL_MAX_IDLE = 10;
    // Must stay well below the MariaDB wait_timeout.
    private static readonly DB_POOL_IDLE_TIMEOUT_IN_MS = 60000;
    private static readonly DB_KEEP_ALIVE_ENABLED = true;
    private static readonly DB_KEEP_ALIVE_INITIAL_DELAY_IN_MS = 30000;
    private static readonly DB_CONNECT_TIMEOUT_IN_MS = 10000;
    private static readonly DB_WAIT_FOR_CONNECTIONS = true;
    private static readonly DB_QUEUE_LIMIT = 100;
    // mysql2 has no acquire timeout, it is enforced in DatabaseConnectionUtility.
    private static readonly DB_ACQUIRE_TIMEOUT_IN_MS = 15000;
    private static readonly DB_READ_MAX_ATTEMPTS = 2;

    private static readonly CRON_JOB_TIMEZONE = 'Europe/Berlin';
    private static readonly CRON_JOB_BT_INSTANCE_BACKUP = '35 2 * * *'; // At 02:35 AM every day
    private static readonly CRON_JOB_BT_DATA_POPULATION_IF_EMPTY = '0 */3 * * *'; // Every 3 hours
    private static readonly CRON_JOB_LOG_RETENTION = '15 3 * * *'; // Daily at 03:15 AM
    private static readonly LOG_RETENTION_DAYS = 90;
    private static readonly THROTTLE_TTL_IN_MS = 60000; // 1 minute
    private static readonly THROTTLE_LIMIT = 1500; // 1500 requests per TTL
    private static readonly THROTTLE_IS_ENABLED = true;

    // SOC endpoints aggregate the whole platform per request, so their result set is cached.
    // Upper bound: the platform reconciles with BeyondTrust every 30 minutes, so a shorter
    // TTL adds no meaningful staleness. Lower bound: a full paginated pull must be served
    // from a single snapshot, otherwise items shift across page boundaries and the consumer
    // silently misses or duplicates records. Set to 0 to disable caching.
    private static readonly SOC_CACHE_TTL_IN_MS = 300000; // 5 minutes

    // Maintenance / data reset
    // Comma-separated list of PRA usernames that are allowed to trigger a full data reset.
    private static readonly RESET_ALLOWED_USERNAMES = 'a.zaschka@treatec.de';
    // Tables that must never be truncated by the data reset (everything else is wiped).
    private static readonly RESET_KEEP_TABLES = ['pra_user', 'pra_access', 'beyondtrust_instances'];

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
            acquireTimeoutInMs: DefaultAppConfig.DB_ACQUIRE_TIMEOUT_IN_MS,
            readMaxAttempts: DefaultAppConfig.DB_READ_MAX_ATTEMPTS,
            extra: {
                connectionLimit: DefaultAppConfig.DB_EXTRA_MAX_CONNECTIONS,
                maxIdle: DefaultAppConfig.DB_POOL_MAX_IDLE,
                idleTimeout: DefaultAppConfig.DB_POOL_IDLE_TIMEOUT_IN_MS,
                enableKeepAlive: DefaultAppConfig.DB_KEEP_ALIVE_ENABLED,
                keepAliveInitialDelay: DefaultAppConfig.DB_KEEP_ALIVE_INITIAL_DELAY_IN_MS,
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
            logRetention: DefaultAppConfig.CRON_JOB_LOG_RETENTION,
            logRetentionDays: DefaultAppConfig.LOG_RETENTION_DAYS,
        };
    }

    public static get throttle() {
        return {
            isEnabled: DefaultAppConfig.THROTTLE_IS_ENABLED,
            ttlInMs: DefaultAppConfig.THROTTLE_TTL_IN_MS,
            limit: DefaultAppConfig.THROTTLE_LIMIT,
        };
    }

    public static get user() {
        return {
            /**
             * Ids of the BeyondTrust security providers that hold local accounts.
             *
             * BeyondTrust reports a security provider on every user. Whether it also reports one for local
             * accounts, and with which id, has not been verified against a live instance yet. With the list
             * empty, a user without a security provider counts as local, which is the assumption the code has
             * always made. Once the id of the local provider is known it is added here through
             * USER_LOCAL_SECURITY_PROVIDER_IDS, no code change needed.
             */
            localSecurityProviderIds: '',
        };
    }

    public static get maintenance() {
        return {
            resetAllowedUsernames: DefaultAppConfig.RESET_ALLOWED_USERNAMES,
            resetKeepTables: DefaultAppConfig.RESET_KEEP_TABLES,
        };
    }

    public static get soc() {
        return {
            cacheTtlInMs: DefaultAppConfig.SOC_CACHE_TTL_IN_MS,
        };
    }
}

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
    // ------------------------------------------------------------------------------------------------
    // Database connection settings (MARLINKPRA-42)
    //
    // All values in this section are plain constants on purpose. They are NOT read from environment
    // variables and cannot be overridden per environment. To tune the database connection, change the
    // constant here and redeploy. Only the connection endpoint and the credentials (DB_TYPE, DB_HOST,
    // DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME) come from the environment.
    //
    // MariaDB server side settings these values are sized for, on all environments (MARLINKPRA-42):
    //   max_connections = 300, wait_timeout = interactive_timeout = 300 s
    // DEV and Pre-Prod already run with them. The DC team applies them on Prod before this version is
    // deployed there. Do NOT deploy this version against a database that still runs with the MariaDB
    // defaults (max_connections = 151, wait_timeout = 28800 s), see the pool sizing below.
    // ------------------------------------------------------------------------------------------------
    private static readonly DB_RETRY_ATTEMPTS = 60;
    private static readonly DB_RETRY_DELAY_IN_MS = 8000; // 8 seconds
    private static readonly DB_MAX_QUERY_EXECUTION_TIME_IN_MS = 15000; // 15 seconds

    // Connection pool (mysql2).
    // Sizing: pool(30) per instance of pra-api plus pool(50) per instance of pra-sync-api is 80 connections
    // per deployment and 160 during a rolling update (old and new pods run side by side). That fits
    // max_connections = 300 with headroom for admin tools and monitoring, but NOT the MariaDB default of 151.
    // When changing a pool size, keep the sum of both services (see the pool constant in pra-sync-api)
    // within max_connections and count the rolling update twice.
    // pra-api serves short-lived HTTP requests without saga burst patterns, so 30 is sufficient.
    private static readonly DB_EXTRA_MAX_CONNECTIONS = 30;

    // Idle connections above this number are closed by the pool (mysql2 checks once per second).
    // IMPORTANT: mysql2 only runs its idle cleanup when maxIdle < connectionLimit. With the default
    // (maxIdle = connectionLimit) idle connections are never retired and can silently go stale.
    private static readonly DB_POOL_MAX_IDLE = 10;

    // Idle connections older than this are closed by the pool.
    // Must stay well below the MariaDB wait_timeout (300 s) and below the idle timeout of the network
    // path between the cluster and the database, so the pool retires a connection before the server or a
    // firewall silently drops it.
    private static readonly DB_POOL_IDLE_TIMEOUT_IN_MS = 60000; // 60 seconds

    // TCP keep-alive on pooled sockets. mysql2 enables keep-alive by default but without an initial delay,
    // which leaves the OS default (typically 2 hours) in place and does not help against idle drops.
    private static readonly DB_KEEP_ALIVE_ENABLED = true;
    private static readonly DB_KEEP_ALIVE_INITIAL_DELAY_IN_MS = 30000; // 30 seconds

    private static readonly DB_CONNECT_TIMEOUT_IN_MS = 10000; // 10 seconds to establish a connection
    private static readonly DB_WAIT_FOR_CONNECTIONS = true; // Wait for a free pooled connection (MySQL2 option)

    // Max requests waiting for a free pooled connection before failing (MySQL2 option).
    // This limits the queue depth only, not the time a request waits in the queue.
    private static readonly DB_QUEUE_LIMIT = 100;

    // Max time a request waits for a free pooled connection. mysql2 has no acquire timeout of its own, so
    // this is enforced in DatabaseConnectionUtility. After this time the request fails with 503 instead of
    // hanging until the client gives up.
    private static readonly DB_ACQUIRE_TIMEOUT_IN_MS = 15000;

    // Attempts for read-only queries. A read is repeated once with a fresh connection when the pooled
    // connection turned out to be dead (connection lost or reset). Writes are never repeated automatically.
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

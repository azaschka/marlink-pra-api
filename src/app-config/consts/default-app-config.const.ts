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

    // System log and monitoring records are persisted asynchronously in bounded batches (one connection per
    // writer). A full buffer drops new rows and documents the gap; see BufferedEntityWriter.
    private static readonly LOG_WRITER_CAPACITY = 10000;
    private static readonly LOG_WRITER_BATCH_SIZE = 200;
    private static readonly LOG_WRITER_FLUSH_INTERVAL_IN_MS = 1000;
    private static readonly LOG_WRITER_ACQUIRE_TIMEOUT_IN_MS = 5000;
    private static readonly LOG_WRITER_MAX_BACKOFF_IN_MS = 30000;
    private static readonly LOG_WRITER_SHUTDOWN_TIMEOUT_IN_MS = 5000;
    private static readonly LOG_WRITER_DROP_REPORT_INTERVAL_IN_MS = 60000;
    // Stays below the 65,535 byte limit of the TEXT payload column, measured in bytes (utf8mb4).
    private static readonly LOG_PAYLOAD_MAX_BYTES = 60000;

    // One JSON line with memory, pool and background work figures per interval; 0 disables the report.
    private static readonly RESOURCE_REPORT_INTERVAL_IN_MS = 300000; // 5 minutes

    private static readonly CRON_JOB_TIMEZONE = 'Europe/Berlin';
    private static readonly CRON_JOB_BT_INSTANCE_BACKUP = '35 2 * * *'; // At 02:35 AM every day
    private static readonly CRON_JOB_BT_DATA_POPULATION_IF_EMPTY = '0 */3 * * *'; // Every 3 hours
    // Hourly: with a daily run rows reached 91 days and more after a failed run (STAB-08). Minute 17 keeps the
    // run away from the :00 and :30 scan cycles of the Sync API.
    private static readonly CRON_JOB_LOG_RETENTION = '17 * * * *';
    private static readonly LOG_RETENTION_DAYS = 90;
    private static readonly MONITORING_RETENTION_DAYS = 90;
    // MariaDB GET_LOCK per table so that several replicas never run the retention of a table at the same time.
    private static readonly RETENTION_DISTRIBUTED_LOCK_ENABLED = true;
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

    // Outbound calls to the Sync API. An axios timeout limits the time until the response headers arrive; with the
    // default transport (follow-redirects) it also ends a body that is idle for the same time. For an ordinary call
    // it is the longest time without an answer. A streamed download body is guarded by downloadIdleInMs.
    public static get praSyncApiTimeouts() {
        return {
            // Every call without an explicit override. Above the Sync API's worst case for one BeyondTrust read
            // (4 attempts with a 60 s read timeout plus backoff, about 250 s) and for one write (3 min client
            // timeout). Composite Sync operations can take longer (a create followed by a lookup: about 430 s), so
            // a 504 after a write means that its outcome is unknown; the next run finds the result.
            defaultInMs: 300000,
            // Manual scan per entity type and "sync all external": above the Sync scan budget (20 min).
            scanInMs: 25 * 60 * 1000,
            // The Sync API fetches and stores a large file before it answers (BeyondTrust backup, jumpoint node ISO).
            fileTransferInMs: 30 * 60 * 1000,
            // A streamed installer download fails when no data arrived for this long.
            downloadIdleInMs: 120000,
        };
    }

    public static get logWriter() {
        return {
            capacity: DefaultAppConfig.LOG_WRITER_CAPACITY,
            batchSize: DefaultAppConfig.LOG_WRITER_BATCH_SIZE,
            flushIntervalInMs: DefaultAppConfig.LOG_WRITER_FLUSH_INTERVAL_IN_MS,
            acquireTimeoutInMs: DefaultAppConfig.LOG_WRITER_ACQUIRE_TIMEOUT_IN_MS,
            maxBackoffInMs: DefaultAppConfig.LOG_WRITER_MAX_BACKOFF_IN_MS,
            shutdownTimeoutInMs: DefaultAppConfig.LOG_WRITER_SHUTDOWN_TIMEOUT_IN_MS,
            dropReportIntervalInMs: DefaultAppConfig.LOG_WRITER_DROP_REPORT_INTERVAL_IN_MS,
        };
    }

    public static get retention() {
        return {
            monitoringRetentionDays: DefaultAppConfig.MONITORING_RETENTION_DAYS,
            distributedLockEnabled: DefaultAppConfig.RETENTION_DISTRIBUTED_LOCK_ENABLED,
        };
    }

    public static get logPayloadMaxBytes(): number {
        return DefaultAppConfig.LOG_PAYLOAD_MAX_BYTES;
    }

    public static get observability() {
        return {
            resourceReportIntervalInMs: DefaultAppConfig.RESOURCE_REPORT_INTERVAL_IN_MS,
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
             * BeyondTrust reports a security provider on every user. Local accounts belong to the built-in
             * provider, which is id 1: it exists before any provider is configured, and every provider added
             * afterwards increments from there. Verified against the Marlink instance.
             *
             * Kept configurable through USER_LOCAL_SECURITY_PROVIDER_IDS for an instance that ended up with a
             * different id, and so that a second local provider can be added without a code change.
             */
            localSecurityProviderIds: '1',
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

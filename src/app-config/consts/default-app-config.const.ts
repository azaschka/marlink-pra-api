import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export abstract class DefaultAppConfig {
    private static readonly PORT_NUMBER = 9000;

    private static readonly HEALTH_DISK_STORAGE_USAGE_THRESHOLD_IN_PERCENT = 80;
    private static readonly HEALTH_MEMORY_HEAP_USAGE_THRESHOLD_IN_MB = 256;
    private static readonly HEALTH_PING_CHECK_PRA_SYNC_API_URL = 'http://pra-sync-api:9001/health';
    private static readonly BEYOND_TRUST_CONSOLE_URL = 'https://marlinksra-pp.beyondtrustcloud.com/login';
    private static readonly PRA_SYNC_API_BASE_URL = 'http://pra-sync-api:9001';
    private static readonly DB_RETRY_ATTEMPTS = 60;
    private static readonly DB_RETRY_DELAY_IN_MS = 8000; // 8 seconds
    private static readonly DB_MAX_QUERY_EXECUTION_TIME_IN_MS = 15000; // 15 seconds
    private static readonly CRON_JOB_TIMEZONE = 'Europe/Berlin';
    private static readonly CRON_JOB_EXPRESSION = '0 0 * * *'; // Every day at midnight
    private static readonly THROTTLE_TTL_IN_MS = 60000; // 1 minute
    private static readonly THROTTLE_LIMIT = 500; // 500 requests per TTL
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
        };
    }

    public static get database(): TypeOrmModuleOptions {
        return {
            retryAttempts: DefaultAppConfig.DB_RETRY_ATTEMPTS,
            retryDelay: DefaultAppConfig.DB_RETRY_DELAY_IN_MS,
            maxQueryExecutionTime: DefaultAppConfig.DB_MAX_QUERY_EXECUTION_TIME_IN_MS, // Only applicable to MariaDB and MySQL
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
                siteAdministrator: {
                    publicDisplayNamePrefix: 'ADMINISTRATOR',
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
            expressions: DefaultAppConfig.CRON_JOB_EXPRESSION,
            retryAttempts: 5,
            retryDelayInMs: 10000,
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

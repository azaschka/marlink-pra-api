import { Injectable } from '@nestjs/common';
import { resolve } from 'path';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DefaultAppConfig } from '../consts';

@Injectable()
export class AppConfigService {
    private static readonly DEFAULT_UNDEFINED_STRING = 'unknown';
    private static readonly DEFAULT_UNDEFINED_NUMBER = 0;

    constructor(private readonly configService: ConfigService) {}

    public get isProduction(): boolean {
        return this.env.toLowerCase() === 'production' || this.env.toLowerCase() === 'prod';
    }

    public get env(): string {
        return this.configService.get<string>('ENV') ?? AppConfigService.DEFAULT_UNDEFINED_STRING;
    }

    public get port(): number {
        return this.configService.get<number>('PORT') ?? DefaultAppConfig.port;
    }

    public get health() {
        return {
            diskStorageUsageThresholdInPercent:
                this.configService.get<number>('HEALTH_DISK_STORAGE_USAGE_THRESHOLD_IN_PERCENT') ??
                DefaultAppConfig.health.diskStorageUsageThresholdInPercent,
            memoryHeapUsageThresholdInMB:
                this.configService.get<number>('HEALTH_MEMORY_HEAP_USAGE_THRESHOLD_IN_MB') ??
                DefaultAppConfig.health.memoryHeapUsageThresholdInMB,
            pingCheckPraSyncApiUrl:
                this.configService.get<string>('HEALTH_PING_CHECK_PRA_SYNC_API_URL') ??
                DefaultAppConfig.health.pingCheckPraSyncApiUrl,
        };
    }

    public get auth() {
        return {
            apiKey: this.configService.get<string>('PRA_API_KEY') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            jwtSecret: this.configService.get<string>('JWT_SECRET') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            jwtExpiry: this.configService.get<string>('JWT_EXPIRY') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            fallbackAdmin: {
                enabled: DefaultAppConfig.auth.fallbackAdminEnabled,
                username: DefaultAppConfig.auth.fallbackAdminUsername,
                passwordHash: DefaultAppConfig.auth.fallbackAdminPasswordHash,
            },
        };
    }

    public get praAdminConsole() {
        return {
            consoleUrl:
                this.configService.get<string>('PRA_ADMIN_CONSOLE_URL') ?? DefaultAppConfig.praAdminConsole.consoleUrl,
        };
    }

    public get beyondTrust() {
        return {
            consoleUrl:
                this.configService.get<string>('BEYONDTRUST_CONSOLE_URL') ?? DefaultAppConfig.beyondTrust.consoleUrl,
        };
    }

    public get praSyncApi() {
        return {
            baseUrl: this.configService.get<string>('PRA_SYNC_API_BASE_URL') ?? DefaultAppConfig.praSyncApi.baseUrl,
            beyondtrustInstance: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_BEYONDTRUST_INSTANCE_PATH') ??
                    DefaultAppConfig.praSyncApi.beyondtrustInstance.path,
                backup: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_BEYONDTRUST_INSTANCE_BACKUP_PATH') ??
                        DefaultAppConfig.praSyncApi.beyondtrustInstance.backup.path,
                },
            },
            user: {
                path: this.configService.get<string>('PRA_SYNC_API_USER_PATH') ?? DefaultAppConfig.praSyncApi.user.path,
                groupPolicy: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_USER_GROUP_POLICY_PATH') ??
                        DefaultAppConfig.praSyncApi.user.groupPolicy.path,
                },
            },
            jumpClient: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_JUMP_CLIENT_PATH') ??
                    DefaultAppConfig.praSyncApi.jumpClient.path,
                copy:
                    this.configService.get<string>('PRA_SYNC_API_COPY_JUMP_CLIENT') ??
                    DefaultAppConfig.praSyncApi.jumpClient.copy,
                installer: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_CLIENT_INSTALLER_PATH') ??
                        DefaultAppConfig.praSyncApi.jumpClient.installer.path,
                    platform: {
                        path:
                            this.configService.get<string>('PRA_SYNC_API_JUMP_CLIENT_INSTALLER_PLATFORM_PATH') ??
                            DefaultAppConfig.praSyncApi.jumpClient.installer.platform.path,
                    },
                },
            },
            groupPolicy: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_GROUP_POLICY_PATH') ??
                    DefaultAppConfig.praSyncApi.groupPolicy.path,
                jumpoint: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_GROUP_POLICY_JUMPOINT_PATH') ??
                        DefaultAppConfig.praSyncApi.groupPolicy.jumpoint.path,
                },
                jumpGroup: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_GROUP_POLICY_JUMP_GROUP_PATH') ??
                        DefaultAppConfig.praSyncApi.groupPolicy.jumpGroup.path,
                },
                member: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_GROUP_POLICY_MEMBER_PATH') ??
                        DefaultAppConfig.praSyncApi.groupPolicy.member.path,
                },
                team: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_GROUP_POLICY_TEAM_PATH') ??
                        DefaultAppConfig.praSyncApi.groupPolicy.team.path,
                },
            },
            team: {
                path: this.configService.get<string>('PRA_SYNC_API_TEAM_PATH') ?? DefaultAppConfig.praSyncApi.team.path,
                user: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_TEAM_USER_PATH') ??
                        DefaultAppConfig.praSyncApi.team.user.path,
                },
            },
            jumpGroup: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_JUMP_GROUP_PATH') ??
                    DefaultAppConfig.praSyncApi.jumpGroup.path,
            },
            jumpPolicy: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_JUMP_POLICY_PATH') ??
                    DefaultAppConfig.praSyncApi.jumpPolicy.path,
            },
            jumpoint: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_JUMPOINT_PATH') ??
                    DefaultAppConfig.praSyncApi.jumpoint.path,
                node: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_JUMPOINT_NODE_PATH') ??
                        DefaultAppConfig.praSyncApi.jumpoint.node.path,
                },
                installer: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_JUMPOINT_INSTALLER_PATH') ??
                        DefaultAppConfig.praSyncApi.jumpoint.installer.path,
                },
            },
            jumpItem: {
                remoteRdp: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_REMOTE_RDP_PATH') ??
                        DefaultAppConfig.praSyncApi.jumpItem.remoteRdp.path,
                    copy:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_COPY_REMOTE_RDP') ??
                        DefaultAppConfig.praSyncApi.jumpItem.remoteRdp.copy,
                },
                shellJump: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_SHELL_JUMP_PATH') ??
                        DefaultAppConfig.praSyncApi.jumpItem.shellJump.path,
                    copy:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_COPY_SHELL_JUMP') ??
                        DefaultAppConfig.praSyncApi.jumpItem.shellJump.copy,
                },
                webJump: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_WEB_JUMP_PATH') ??
                        DefaultAppConfig.praSyncApi.jumpItem.webJump.path,
                    copy:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_COPY_WEB_JUMP') ??
                        DefaultAppConfig.praSyncApi.jumpItem.webJump.copy,
                },
                remoteVnc: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_REMOTE_VNC_PATH') ??
                        DefaultAppConfig.praSyncApi.jumpItem.remoteVnc.path,
                    copy:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_COPY_REMOTE_VNC') ??
                        DefaultAppConfig.praSyncApi.jumpItem.remoteVnc.copy,
                },
                protocolTunnelJump: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_PROTOCOL_TUNNEL_JUMP_PATH') ??
                        DefaultAppConfig.praSyncApi.jumpItem.protocolTunnelJump.path,
                    copy:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_COPY_PROTOCOL_TUNNEL_JUMP') ??
                        DefaultAppConfig.praSyncApi.jumpItem.protocolTunnelJump.copy,
                },
            },
            sessionPolicy: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_SESSION_POLICY_PATH') ??
                    DefaultAppConfig.praSyncApi.sessionPolicy.path,
            },
            deployments: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_DEPLOYMENTS_PATH') ??
                    DefaultAppConfig.praSyncApi.deployments.path,
                jumpointNode: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_DEPLOYMENTS_JUMPOINT_NODE_PATH') ??
                        DefaultAppConfig.praSyncApi.deployments.jumpointNode.path,
                    approve:
                        this.configService.get<string>('PRA_SYNC_API_DEPLOYMENTS_JUMPOINT_NODE_APPROVE') ??
                        DefaultAppConfig.praSyncApi.deployments.jumpointNode.approve,
                    deploy:
                        this.configService.get<string>('PRA_SYNC_API_DEPLOYMENTS_JUMPOINT_NODE_DEPLOY') ??
                        DefaultAppConfig.praSyncApi.deployments.jumpointNode.deploy,
                    services: {
                        path:
                            this.configService.get<string>('PRA_SYNC_API_DEPLOYMENTS_JUMPOINT_NODE_SERVICES_PATH') ??
                            DefaultAppConfig.praSyncApi.deployments.jumpointNode.services.path,
                    },
                    iso: {
                        path:
                            this.configService.get<string>('PRA_SYNC_API_DEPLOYMENTS_JUMPOINT_NODE_ISO_PATH') ??
                            DefaultAppConfig.praSyncApi.deployments.jumpointNode.iso.path,
                    },
                },
            },
            discrepancy: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_DISCREPANCY_PATH') ??
                    DefaultAppConfig.praSyncApi.discrepancy.path,
                scan: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_DISCREPANCY_SCAN_PATH') ??
                        DefaultAppConfig.praSyncApi.discrepancy.scan.path,
                    all:
                        this.configService.get<string>('PRA_SYNC_API_DISCREPANCY_SCAN_ALL') ??
                        DefaultAppConfig.praSyncApi.discrepancy.scan.all,
                },
                sync: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_DISCREPANCY_SYNC_PATH') ??
                        DefaultAppConfig.praSyncApi.discrepancy.sync.path,
                    allExternal:
                        this.configService.get<string>('PRA_SYNC_API_DISCREPANCY_SYNC_ALL_EXTERNAL') ??
                        DefaultAppConfig.praSyncApi.discrepancy.sync.allExternal,
                },
            },
        };
    }

    /**
     * TypeORM database options. Only the connection endpoint and credentials are read from the environment.
     * Every pool and timeout setting comes from constants in DefaultAppConfig and is deliberately not
     * overridable via environment variables.
     */
    public get database(): TypeOrmModuleOptions {
        return {
            type: this.configService.get<'mariadb' | 'mysql'>('DB_TYPE') ?? undefined,
            // Explicit driver: TypeORM otherwise tries the legacy 'mysql' package first, which would silently
            // ignore the mysql2 pool options below if it ever became installed.
            connectorPackage: 'mysql2',
            host: this.configService.get<string>('DB_HOST') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            port: this.configService.get<number>('DB_PORT') ?? AppConfigService.DEFAULT_UNDEFINED_NUMBER,
            username: this.configService.get<string>('DB_USERNAME') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            password: this.configService.get<string>('DB_PASSWORD') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            database: this.configService.get<string>('DB_NAME') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            // resolve() converts the relative '../..' to an absolute path before passing
            // it to TypeORM's glob library, which cannot reliably resolve '..' segments.
            // Result: /app/dist/**/*.entity.{ts,js}  (finds every entity in the project).
            entities: [`${resolve(__dirname, '../..')}/**/*.entity{.ts,.js}`],
            synchronize: !this.isProduction,
            logging: false,
            autoLoadEntities: true,
            retryAttempts: DefaultAppConfig.database.retryAttempts,
            retryDelay: DefaultAppConfig.database.retryDelay,
            maxQueryExecutionTime: DefaultAppConfig.database.maxQueryExecutionTime, // Only applicable to MariaDB and MySQL
            extra: {
                connectionLimit: this.databaseMaxConnections,
                // Pool hygiene (mysql2). Idle connections are retired before MariaDB (wait_timeout) or the
                // network path silently drops them, see DefaultAppConfig for the reasoning and invariants.
                maxIdle: DefaultAppConfig.database.extra.maxIdle,
                idleTimeout: DefaultAppConfig.database.extra.idleTimeout,
                enableKeepAlive: DefaultAppConfig.database.extra.enableKeepAlive,
                keepAliveInitialDelay: DefaultAppConfig.database.extra.keepAliveInitialDelay,
                // Connection timeout: abort if a connection cannot be established in time (mysql2 option)
                connectTimeout: DefaultAppConfig.database.connectTimeout,
                // Wait for a free pooled connection before failing (mysql2 option)
                waitForConnections: DefaultAppConfig.database.waitForConnections,
                // Max requests waiting for a pooled connection (mysql2 option).
                // Prevents "Queue limit reached" errors during traffic bursts.
                queueLimit: DefaultAppConfig.database.queueLimit,
            },
        };
    }

    public get databaseMaxConnections(): number {
        return DefaultAppConfig.database.extra.connectionLimit;
    }

    public get storage() {
        return {
            rootPath: this.configService.get<string>('STORAGE_ROOT_PATH') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            beyondTrustBackupPath:
                this.configService.get<string>('STORAGE_BEYONDTRUST_BACKUP_PATH') ??
                AppConfigService.DEFAULT_UNDEFINED_STRING,
        };
    }

    public get site() {
        return {
            groupPolicy: {
                managerPrefix:
                    this.configService.get<string>('SITE_GROUP_POLICY_MANAGER_PREFIX') ??
                    DefaultAppConfig.site.groupPolicy.managerPrefix,
                operatorPrefix:
                    this.configService.get<string>('SITE_GROUP_POLICY_OPERATOR_PREFIX') ??
                    DefaultAppConfig.site.groupPolicy.operatorPrefix,
                administratorPrefix:
                    this.configService.get<string>('SITE_GROUP_POLICY_ADMINISTRATOR_PREFIX') ??
                    DefaultAppConfig.site.groupPolicy.administratorPrefix,
                marlink: {
                    superuser:
                        this.configService.get<string>('SITE_GROUP_POLICY_MARLINK_SUPERUSER') ??
                        DefaultAppConfig.site.groupPolicy.marlink.superuser,
                    operator:
                        this.configService.get<string>('SITE_GROUP_POLICY_MARLINK_OPERATOR') ??
                        DefaultAppConfig.site.groupPolicy.marlink.operator,
                },
                managerAccess:
                    this.configService.get<string>('SITE_GROUP_POLICY_MANAGER_ACCESS') ??
                    DefaultAppConfig.site.groupPolicy.managerAccess,
                administratorAccess:
                    this.configService.get<string>('SITE_GROUP_POLICY_ADMINISTRATOR_ACCESS') ??
                    DefaultAppConfig.site.groupPolicy.administratorAccess,
                adminOperatorAccess:
                    this.configService.get<string>('SITE_GROUP_POLICY_ADMIN_OPERATOR_ACCESS') ??
                    DefaultAppConfig.site.groupPolicy.adminOperatorAccess,
                limitedAccess:
                    this.configService.get<string>('SITE_GROUP_POLICY_LIMITED_ACCESS') ??
                    DefaultAppConfig.site.groupPolicy.limitedAccess,
                fullAccess:
                    this.configService.get<string>('SITE_GROUP_POLICY_FULL_ACCESS') ??
                    DefaultAppConfig.site.groupPolicy.fullAccess,
            },
            user: {
                siteManager: {
                    publicDisplayNamePrefix:
                        this.configService.get<string>('SITE_USER_SITE_MANAGER_PUBLIC_DISPLAY_NAME_PREFIX') ??
                        DefaultAppConfig.site.user.siteManager.publicDisplayNamePrefix,
                },
                siteAuditor: {
                    publicDisplayNamePrefix:
                        this.configService.get<string>('SITE_USER_SITE_AUDITOR_PUBLIC_DISPLAY_NAME_PREFIX') ??
                        DefaultAppConfig.site.user.siteAuditor.publicDisplayNamePrefix,
                },
            },
            jumpPolicy: {
                authSuffix:
                    this.configService.get<string>('SITE_JUMP_POLICY_AUTH_SUFFIX') ??
                    DefaultAppConfig.site.jumpPolicy.authSuffix,
                noAuthSuffix:
                    this.configService.get<string>('SITE_JUMP_POLICY_NO_AUTH_SUFFIX') ??
                    DefaultAppConfig.site.jumpPolicy.noAuthSuffix,
                notifySuffix:
                    this.configService.get<string>('SITE_JUMP_POLICY_NOTIFY_SUFFIX') ??
                    DefaultAppConfig.site.jumpPolicy.notifySuffix,
                notificationDisplayNamePrefix:
                    this.configService.get<string>('SITE_JUMP_POLICY_NOTIFICATION_DISPLAY_NAME_PREFIX') ??
                    DefaultAppConfig.site.jumpPolicy.notificationDisplayNamePrefix,
                approvalDisplayNamePrefix:
                    this.configService.get<string>('SITE_JUMP_POLICY_APPROVAL_DISPLAY_NAME_PREFIX') ??
                    DefaultAppConfig.site.jumpPolicy.approvalDisplayNamePrefix,
            },
            jumpoint: {
                prefix: this.configService.get<string>('SITE_JUMPOINT_PREFIX') ?? DefaultAppConfig.site.jumpoint.prefix,
            },
        };
    }

    public get customer() {
        return {
            groupPolicy: {
                administratorPrefix:
                    this.configService.get<string>('CUSTOMER_GROUP_POLICY_ADMINISTRATOR_PREFIX') ??
                    DefaultAppConfig.customer.groupPolicy.administratorPrefix,
            },
        };
    }

    public get smtp() {
        return {
            username: this.configService.get<string>('SMTP_USERNAME') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            password: this.configService.get<string>('SMTP_PASSWORD') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            host: this.configService.get<string>('SMTP_HOST') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            port: this.configService.get<number>('SMTP_PORT') ?? AppConfigService.DEFAULT_UNDEFINED_NUMBER,
        };
    }

    public get cronJob() {
        return {
            timezone: this.configService.get<string>('CRON_JOB_TIMEZONE') ?? DefaultAppConfig.cronJob.timezone,
            retryAttempts:
                this.configService.get<number>('CRON_JOB_RETRY_ATTEMPTS') ?? DefaultAppConfig.cronJob.retryAttempts,
            retryDelayInMs:
                this.configService.get<number>('CRON_JOB_RETRY_DELAY_IN_MS') ?? DefaultAppConfig.cronJob.retryDelayInMs,
            btInstanceBackup:
                this.configService.get<string>('CRON_JOB_BT_INSTANCE_BACKUP') ??
                DefaultAppConfig.cronJob.btInstanceBackup,
            btDataPopulationIfEmpty:
                this.configService.get<string>('CRON_JOB_BT_DATA_POPULATION_IF_EMPTY') ??
                DefaultAppConfig.cronJob.btDataPopulationIfEmpty,
            logRetention:
                this.configService.get<string>('CRON_JOB_LOG_RETENTION') ?? DefaultAppConfig.cronJob.logRetention,
            logRetentionDays:
                this.configService.get<number>('LOG_RETENTION_DAYS') ?? DefaultAppConfig.cronJob.logRetentionDays,
        };
    }

    public get maintenance() {
        const configuredUsernames = this.configService.get<string>('RESET_ALLOWED_USERNAMES');

        const resetAllowedUsernames = (configuredUsernames ?? DefaultAppConfig.maintenance.resetAllowedUsernames)
            .split(',')
            .map((username) => username.trim())
            .filter((username) => username.length > 0);

        return {
            resetAllowedUsernames,
            resetKeepTables: DefaultAppConfig.maintenance.resetKeepTables,
        };
    }

    public get throttle() {
        return {
            isEnabled: this.configService.get<boolean>('THROTTLE_IS_ENABLED') ?? DefaultAppConfig.throttle.isEnabled,
            ttlInMs: this.configService.get<number>('THROTTLE_TTL_IN_MS') ?? DefaultAppConfig.throttle.ttlInMs,
            limit: this.configService.get<number>('THROTTLE_LIMIT') ?? DefaultAppConfig.throttle.limit,
        };
    }

    public get soc() {
        return {
            cacheTtlInMs: this.configService.get<number>('SOC_CACHE_TTL_IN_MS') ?? DefaultAppConfig.soc.cacheTtlInMs,
        };
    }
}

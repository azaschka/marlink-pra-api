import { Injectable } from '@nestjs/common';
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
        };
    }

    public get database(): TypeOrmModuleOptions {
        return {
            type: this.configService.get<'mariadb' | 'mysql'>('DB_TYPE') ?? undefined,
            host: this.configService.get<string>('DB_HOST') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            port: this.configService.get<number>('DB_PORT') ?? AppConfigService.DEFAULT_UNDEFINED_NUMBER,
            username: this.configService.get<string>('DB_USERNAME') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            password: this.configService.get<string>('DB_PASSWORD') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            database: this.configService.get<string>('DB_NAME') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: !this.isProduction,
            logging: false,
            autoLoadEntities: true,
            retryAttempts:
                this.configService.get<number>('DB_RETRY_ATTEMPTS') ?? DefaultAppConfig.database.retryAttempts,
            retryDelay: this.configService.get<number>('DB_RETRY_DELAY_IN_MS') ?? DefaultAppConfig.database.retryDelay,
            maxQueryExecutionTime:
                this.configService.get<number>('DB_MAX_QUERY_EXECUTION_TIME_IN_MS') ??
                DefaultAppConfig.database.maxQueryExecutionTime, // Only applicable to MariaDB and MySQL
        };
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
                siteAdministrator: {
                    publicDisplayNamePrefix:
                        this.configService.get<string>('SITE_USER_SITE_ADMINISTRATOR_PUBLIC_DISPLAY_NAME_PREFIX') ??
                        DefaultAppConfig.site.user.siteAdministrator.publicDisplayNamePrefix,
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
            expressions: this.configService.get<string>('CRON_JOB_EXPRESSIONS') ?? DefaultAppConfig.cronJob.expressions,
            retryAttempts:
                this.configService.get<number>('CRON_JOB_RETRY_ATTEMPTS') ?? DefaultAppConfig.cronJob.retryAttempts,
            retryDelayInMs:
                this.configService.get<number>('CRON_JOB_RETRY_DELAY_IN_MS') ?? DefaultAppConfig.cronJob.retryDelayInMs,
        };
    }

    public get throttle() {
        let isEnabled = DefaultAppConfig.throttle.isEnabled;

        const isEnabledString = this.configService.get<string>('THROTTLE_IS_ENABLED');

        if (isEnabledString !== undefined) {
            isEnabled = JSON.parse(isEnabledString) as boolean;
        }

        return {
            isEnabled: isEnabled,
            ttlInMs: this.configService.get<number>('THROTTLE_TTL_IN_MS') ?? DefaultAppConfig.throttle.ttlInMs,
            limit: this.configService.get<number>('THROTTLE_LIMIT') ?? DefaultAppConfig.throttle.limit,
        };
    }
}

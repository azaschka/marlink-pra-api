import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

@Injectable()
export class AppConfigService {
    private static readonly DEFAULT_UNDEFINED_STRING = 'unknown';
    private static readonly DEFAULT_UNDEFINED_NUMBER = 0;
    private static readonly DEFAULT_PORT_NUMBER = 3000;
    private static readonly DEFAULT_HEALTH_DISK_STORAGE_USAGE_THRESHOLD_IN_PERCENT = 80;
    private static readonly DEFAULT_HEALTH_MEMORY_HEAP_USAGE_THRESHOLD_IN_MB = 256;
    private static readonly DEFAULT_HEALTH_PING_CHECK_PRA_SYNC_API_URL = 'http://pra-sync-api:9001/health';
    private static readonly DEFAULT_DB_RETRY_ATTEMPTS = 60;
    private static readonly DEFAULT_DB_RETRY_DELAY_IN_MS = 8000; // 8 seconds
    private static readonly DEFAULT_DB_MAX_QUERY_EXECUTION_TIME_IN_MS = 15000; // 15 seconds

    constructor(private readonly configService: ConfigService) {}

    public get isProduction(): boolean {
        return this.env.toLowerCase() === 'production' || this.env.toLowerCase() === 'prod';
    }

    public get env(): string {
        return this.configService.get<string>('ENV') ?? AppConfigService.DEFAULT_UNDEFINED_STRING;
    }

    public get port(): number {
        return this.configService.get<number>('PORT') ?? AppConfigService.DEFAULT_PORT_NUMBER;
    }

    public get health() {
        return {
            diskStorageUsageThresholdInPercent:
                this.configService.get<number>('HEALTH_DISK_STORAGE_USAGE_THRESHOLD_IN_PERCENT') ??
                AppConfigService.DEFAULT_HEALTH_DISK_STORAGE_USAGE_THRESHOLD_IN_PERCENT,
            memoryHeapUsageThresholdInMB:
                this.configService.get<number>('HEALTH_MEMORY_HEAP_USAGE_THRESHOLD_IN_MB') ??
                AppConfigService.DEFAULT_HEALTH_MEMORY_HEAP_USAGE_THRESHOLD_IN_MB,
            pingCheckPraSyncApiUrl:
                this.configService.get<string>('HEALTH_PING_CHECK_PRA_SYNC_API_URL') ??
                AppConfigService.DEFAULT_HEALTH_PING_CHECK_PRA_SYNC_API_URL,
        };
    }

    public get auth() {
        return {
            apiKey: this.configService.get<string>('PRA_API_KEY') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            jwtSecret: this.configService.get<string>('JWT_SECRET') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            jwtExpiry: this.configService.get<string>('JWT_EXPIRY') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
        };
    }

    public get praSyncApi() {
        return {
            baseUrl:
                this.configService.get<string>('PRA_SYNC_API_BASE_URL') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            beyondtrustInstance: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_BEYONDTRUST_INSTANCE_PATH') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                backup: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_BEYONDTRUST_INSTANCE_BACKUP_PATH') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                },
            },
            user: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_USER_PATH') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                groupPolicy: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_USER_GROUP_POLICY_PATH') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                },
            },
            jumpClient: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_JUMP_CLIENT_PATH') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                copy:
                    this.configService.get<string>('PRA_SYNC_API_COPY_JUMP_CLIENT') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                installer: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_CLIENT_INSTALLER_PATH') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                    platform: {
                        path:
                            this.configService.get<string>('PRA_SYNC_API_JUMP_CLIENT_INSTALLER_PLATFORM_PATH') ??
                            AppConfigService.DEFAULT_UNDEFINED_STRING,
                    },
                },
            },
            groupPolicy: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_GROUP_POLICY_PATH') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                jumpoint: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_GROUP_POLICY_JUMPOINT_PATH') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                },
                jumpGroup: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_GROUP_POLICY_JUMP_GROUP_PATH') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                },
                member: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_GROUP_POLICY_MEMBER_PATH') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                },
                team: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_GROUP_POLICY_TEAM_PATH') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                },
            },
            team: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_TEAM_PATH') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                user: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_TEAM_USER_PATH') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                },
            },
            jumpGroup: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_JUMP_GROUP_PATH') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
            },
            jumpPolicy: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_JUMP_POLICY_PATH') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
            },
            jumpoint: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_JUMPOINT_PATH') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
            },
            jumpItem: {
                remoteRdp: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_REMOTE_RDP_PATH') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                    copy:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_COPY_REMOTE_RDP') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                },
                shellJump: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_SHELL_JUMP_PATH') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                    copy:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_COPY_SHELL_JUMP') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                },
                webJump: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_WEB_JUMP_PATH') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                    copy:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_COPY_WEB_JUMP') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                },
                remoteVnc: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_REMOTE_VNC_PATH') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                    copy:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_COPY_REMOTE_VNC') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                },
                protocolTunnelJump: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_PROTOCOL_TUNNEL_JUMP_PATH') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                    copy:
                        this.configService.get<string>('PRA_SYNC_API_JUMP_ITEM_COPY_PROTOCOL_TUNNEL_JUMP') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
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
                this.configService.get<number>('DB_RETRY_ATTEMPTS') ?? AppConfigService.DEFAULT_DB_RETRY_ATTEMPTS,
            retryDelay:
                this.configService.get<number>('DB_RETRY_DELAY_IN_MS') ?? AppConfigService.DEFAULT_DB_RETRY_DELAY_IN_MS,
            maxQueryExecutionTime:
                this.configService.get<number>('DB_MAX_QUERY_EXECUTION_TIME_IN_MS') ??
                AppConfigService.DEFAULT_DB_MAX_QUERY_EXECUTION_TIME_IN_MS, // Only applicable to MariaDB and MySQL
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
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                operatorPrefix:
                    this.configService.get<string>('SITE_GROUP_POLICY_OPERATOR_PREFIX') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                administratorPrefix:
                    this.configService.get<string>('SITE_GROUP_POLICY_ADMINISTRATOR_PREFIX') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                marlink: {
                    superuser:
                        this.configService.get<string>('SITE_GROUP_POLICY_MARLINK_SUPERUSER') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                    operator:
                        this.configService.get<string>('SITE_GROUP_POLICY_MARLINK_OPERATOR') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                },
                managerAccess:
                    this.configService.get<string>('SITE_GROUP_POLICY_MANAGER_ACCESS') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                administratorAccess:
                    this.configService.get<string>('SITE_GROUP_POLICY_ADMINISTRATOR_ACCESS') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                adminOperatorAccess:
                    this.configService.get<string>('SITE_GROUP_POLICY_ADMIN_OPERATOR_ACCESS') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                limitedAccess:
                    this.configService.get<string>('SITE_GROUP_POLICY_LIMITED_ACCESS') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                fullAccess:
                    this.configService.get<string>('SITE_GROUP_POLICY_FULL_ACCESS') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
            },
            user: {
                siteManager: {
                    publicDisplayNamePrefix:
                        this.configService.get<string>('SITE_USER_SITE_MANAGER_PUBLIC_DISPLAY_NAME_PREFIX') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                },
                siteAdministrator: {
                    publicDisplayNamePrefix:
                        this.configService.get<string>('SITE_USER_SITE_ADMINISTRATOR_PUBLIC_DISPLAY_NAME_PREFIX') ??
                        AppConfigService.DEFAULT_UNDEFINED_STRING,
                },
            },
            jumpPolicy: {
                authSuffix:
                    this.configService.get<string>('SITE_JUMP_POLICY_AUTH_SUFFIX') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                noAuthSuffix:
                    this.configService.get<string>('SITE_JUMP_POLICY_NO_AUTH_SUFFIX') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                notifySuffix:
                    this.configService.get<string>('SITE_JUMP_POLICY_NOTIFY_SUFFIX') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                notificationDisplayNamePrefix:
                    this.configService.get<string>('SITE_JUMP_POLICY_NOTIFICATION_DISPLAY_NAME_PREFIX') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                approvalDisplayNamePrefix:
                    this.configService.get<string>('SITE_JUMP_POLICY_APPROVAL_DISPLAY_NAME_PREFIX') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
            },
            jumpoint: {
                prefix:
                    this.configService.get<string>('SITE_JUMPOINT_PREFIX') ?? AppConfigService.DEFAULT_UNDEFINED_STRING,
            },
        };
    }

    public get customer() {
        return {
            groupPolicy: {
                administratorPrefix:
                    this.configService.get<string>('CUSTOMER_GROUP_POLICY_ADMINISTRATOR_PREFIX') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
            },
        };
    }
}

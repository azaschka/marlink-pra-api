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

    constructor(private readonly configService: ConfigService) {}

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
            user: {
                path:
                    this.configService.get<string>('PRA_SYNC_API_USER_PATH') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
                groupPolicies: {
                    path:
                        this.configService.get<string>('PRA_SYNC_API_USER_GROUP_POLICIES_PATH') ??
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
            synchronize: this.env !== 'production',
            logging: this.env !== 'production',
            autoLoadEntities: true,
        };
    }

    public get customer() {
        return {
            groupPolicy: {
                adminPrefix:
                    this.configService.get<string>('CUSTOMER_GROUP_POLICY_ADMIN_PREFIX') ??
                    AppConfigService.DEFAULT_UNDEFINED_STRING,
            },
        };
    }
}

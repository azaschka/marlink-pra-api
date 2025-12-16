import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
    let service: AppConfigService;
    let configService: ConfigService;

    beforeEach(() => {
        configService = mockConfigService();
        service = new AppConfigService(configService);
    });

    describe('isProduction', () => {
        it.each([
            {
                input: 'production',
                expected: true,
            },
            {
                input: 'prod',
                expected: true,
            },
            {
                input: 'development',
                expected: false,
            },
        ])('should return the correct production status', ({ input, expected }) => {
            const configServiceGetMethod = jest.spyOn(configService, 'get').mockReturnValue(input);

            expect(service.isProduction).toBe(expected);
            expect(configServiceGetMethod).toHaveBeenCalledWith('ENV');
        });
    });

    describe('env', () => {
        it.each([
            {
                input: 'test-env',
                expected: 'test-env',
            },
            {
                input: undefined,
                expected: 'unknown',
            },
        ])('should return the environment variable as expected', ({ input, expected }) => {
            const configServiceGetMethod = jest.spyOn(configService, 'get').mockReturnValue(input);

            expect(service.env).toBe(expected);
            expect(configServiceGetMethod).toHaveBeenCalledWith('ENV');
        });
    });

    describe('port', () => {
        it.each([
            {
                input: 3001,
                expected: 3001,
            },
            {
                input: undefined,
                expected: 9000,
            },
        ])('should return the port variable as expected', ({ input, expected }) => {
            const configServiceGetMethod = jest.spyOn(configService, 'get').mockReturnValue(input);

            expect(service.port).toBe(expected);
            expect(configServiceGetMethod).toHaveBeenCalledWith('PORT');
        });
    });

    describe('health', () => {
        it.each([
            {
                input: {
                    diskStorageUsageThresholdInPercent: 80,
                    memoryHeapUsageThresholdInMB: 150,
                    pingCheckPraSyncApiUrl: 'http://example.com/ping',
                },
                expected: {
                    diskStorageUsageThresholdInPercent: 80,
                    memoryHeapUsageThresholdInMB: 150,
                    pingCheckPraSyncApiUrl: 'http://example.com/ping',
                },
            },
            {
                input: {},
                expected: {
                    diskStorageUsageThresholdInPercent: 80,
                    memoryHeapUsageThresholdInMB: 512,
                    pingCheckPraSyncApiUrl: 'http://pra-sync-api:9001/health',
                },
            },
        ])('should return as expected', ({ input, expected }) => {
            configService.get = jest.fn().mockImplementation((key: string) => {
                switch (key) {
                    case 'HEALTH_DISK_STORAGE_USAGE_THRESHOLD_IN_PERCENT':
                        return input.diskStorageUsageThresholdInPercent;
                    case 'HEALTH_MEMORY_HEAP_USAGE_THRESHOLD_IN_MB':
                        return input.memoryHeapUsageThresholdInMB;
                    case 'HEALTH_PING_CHECK_PRA_SYNC_API_URL':
                        return input.pingCheckPraSyncApiUrl;
                    default:
                        return undefined;
                }
            });

            expect(service.health).toStrictEqual({
                diskStorageUsageThresholdInPercent: expected.diskStorageUsageThresholdInPercent,
                memoryHeapUsageThresholdInMB: expected.memoryHeapUsageThresholdInMB,
                pingCheckPraSyncApiUrl: expected.pingCheckPraSyncApiUrl,
            });
        });
    });

    describe('praSyncApi', () => {
        it.each([
            {
                input: {
                    baseUrl: 'api-base-url-1',
                    beyondtrustInstance: {
                        path: 'api-path-beyondtrust-instance-1',
                        backup: {
                            path: 'api-path-beyondtrust-instance-backup-1',
                        },
                    },
                    user: {
                        path: 'api-path-user-1',
                        groupPolicy: {
                            path: 'api-path-user-group-policy-1',
                        },
                    },
                    jumpClient: {
                        path: 'api-path-jump-client-1',
                        copy: 'api-path-jump-client-copy-1',
                        installer: {
                            path: 'api-path-jump-client-installer-1',
                            platform: {
                                path: 'api-path-jump-client-installer-platform-1',
                            },
                        },
                    },
                    groupPolicy: {
                        path: 'api-path-group-policy-1',
                        jumpoint: {
                            path: 'api-path-group-policy-jumpoint-1',
                        },
                        jumpGroup: {
                            path: 'api-path-group-policy-jump-group-1',
                        },
                        member: {
                            path: 'api-path-group-policy-member-1',
                        },
                        team: {
                            path: 'api-path-group-policy-team-1',
                        },
                    },
                    team: {
                        path: 'api-path-team-1',
                        user: {
                            path: 'api-path-team-user-1',
                        },
                    },
                    jumpGroup: {
                        path: 'api-path-jump-group-1',
                    },
                    jumpPolicy: {
                        path: 'api-path-jump-policy-1',
                    },
                    jumpoint: {
                        path: 'api-path-jumpoint-1',
                        node: {
                            path: 'api-path-jumpoint-node-1',
                        },
                        installer: {
                            path: 'api-path-jumpoint-installer-1',
                        },
                    },
                    jumpItem: {
                        remoteRdp: {
                            path: 'api-path-jump-item-remote-rdp-1',
                            copy: 'api-path-jump-item-remote-rdp-copy-1',
                        },
                        shellJump: {
                            path: 'api-path-jump-item-shell-jump-1',
                            copy: 'api-path-jump-item-shell-jump-copy-1',
                        },
                        webJump: {
                            path: 'api-path-jump-item-web-jump-1',
                            copy: 'api-path-jump-item-web-jump-copy-1',
                        },
                        remoteVnc: {
                            path: 'api-path-jump-item-remote-vnc-1',
                            copy: 'api-path-jump-item-remote-vnc-copy-1',
                        },
                        protocolTunnelJump: {
                            path: 'api-path-jump-item-protocol-tunnel-jump-1',
                            copy: 'api-path-jump-item-protocol-tunnel-jump-copy-1',
                        },
                    },
                    discrepancy: {
                        path: '/api-path-discrepancies-1',
                        scan: {
                            path: '/api-path-discrepancy-scan-1',
                            all: '/api-path-discrepancy-scan-all-1',
                        },
                        sync: {
                            path: '/api-path-discrepancy-sync-1',
                        },
                    },
                },
                expected: {
                    baseUrl: 'api-base-url-1',
                    beyondtrustInstance: {
                        path: 'api-path-beyondtrust-instance-1',
                        backup: {
                            path: 'api-path-beyondtrust-instance-backup-1',
                        },
                    },
                    user: {
                        path: 'api-path-user-1',
                        groupPolicy: {
                            path: 'api-path-user-group-policy-1',
                        },
                    },
                    jumpClient: {
                        path: 'api-path-jump-client-1',
                        copy: 'api-path-jump-client-copy-1',
                        installer: {
                            path: 'api-path-jump-client-installer-1',
                            platform: {
                                path: 'api-path-jump-client-installer-platform-1',
                            },
                        },
                    },
                    groupPolicy: {
                        path: 'api-path-group-policy-1',
                        jumpoint: {
                            path: 'api-path-group-policy-jumpoint-1',
                        },
                        jumpGroup: {
                            path: 'api-path-group-policy-jump-group-1',
                        },
                        member: {
                            path: 'api-path-group-policy-member-1',
                        },
                        team: {
                            path: 'api-path-group-policy-team-1',
                        },
                    },
                    team: {
                        path: 'api-path-team-1',
                        user: {
                            path: 'api-path-team-user-1',
                        },
                    },
                    jumpGroup: {
                        path: 'api-path-jump-group-1',
                    },
                    jumpPolicy: {
                        path: 'api-path-jump-policy-1',
                    },
                    jumpoint: {
                        path: 'api-path-jumpoint-1',
                        node: {
                            path: 'api-path-jumpoint-node-1',
                        },
                        installer: {
                            path: 'api-path-jumpoint-installer-1',
                        },
                    },
                    jumpItem: {
                        remoteRdp: {
                            path: 'api-path-jump-item-remote-rdp-1',
                            copy: 'api-path-jump-item-remote-rdp-copy-1',
                        },
                        shellJump: {
                            path: 'api-path-jump-item-shell-jump-1',
                            copy: 'api-path-jump-item-shell-jump-copy-1',
                        },
                        webJump: {
                            path: 'api-path-jump-item-web-jump-1',
                            copy: 'api-path-jump-item-web-jump-copy-1',
                        },
                        remoteVnc: {
                            path: 'api-path-jump-item-remote-vnc-1',
                            copy: 'api-path-jump-item-remote-vnc-copy-1',
                        },
                        protocolTunnelJump: {
                            path: 'api-path-jump-item-protocol-tunnel-jump-1',
                            copy: 'api-path-jump-item-protocol-tunnel-jump-copy-1',
                        },
                    },
                    discrepancy: {
                        path: '/api-path-discrepancies-1',
                        scan: {
                            path: '/api-path-discrepancy-scan-1',
                            all: '/api-path-discrepancy-scan-all-1',
                        },
                        sync: {
                            path: '/api-path-discrepancy-sync-1',
                        },
                    },
                },
            },
            {
                input: {},
                expected: {
                    baseUrl: 'http://pra-sync-api:9001',
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
                    discrepancy: {
                        path: '/discrepancies',
                        scan: {
                            path: '/scan',
                            all: '/all',
                        },
                        sync: {
                            path: '/sync',
                        },
                    },
                },
            },
        ])('should return the configuration as expected', ({ input, expected }) => {
            configService.get = jest.fn().mockImplementation((key: string) => {
                switch (key) {
                    case 'PRA_SYNC_API_BASE_URL':
                        return input.baseUrl;
                    case 'PRA_SYNC_API_BEYONDTRUST_INSTANCE_PATH':
                        return input.beyondtrustInstance?.path;
                    case 'PRA_SYNC_API_BEYONDTRUST_INSTANCE_BACKUP_PATH':
                        return input.beyondtrustInstance?.backup?.path;
                    case 'PRA_SYNC_API_USER_PATH':
                        return input.user?.path;
                    case 'PRA_SYNC_API_USER_GROUP_POLICY_PATH':
                        return input.user?.groupPolicy?.path;
                    case 'PRA_SYNC_API_JUMP_CLIENT_PATH':
                        return input.jumpClient?.path;
                    case 'PRA_SYNC_API_COPY_JUMP_CLIENT':
                        return input.jumpClient?.copy;
                    case 'PRA_SYNC_API_JUMP_CLIENT_INSTALLER_PATH':
                        return input.jumpClient?.installer?.path;
                    case 'PRA_SYNC_API_JUMP_CLIENT_INSTALLER_PLATFORM_PATH':
                        return input.jumpClient?.installer?.platform?.path;
                    case 'PRA_SYNC_API_GROUP_POLICY_PATH':
                        return input.groupPolicy?.path;
                    case 'PRA_SYNC_API_GROUP_POLICY_JUMP_GROUP_PATH':
                        return input.groupPolicy?.jumpGroup?.path;
                    case 'PRA_SYNC_API_GROUP_POLICY_MEMBER_PATH':
                        return input.groupPolicy?.member?.path;
                    case 'PRA_SYNC_API_GROUP_POLICY_TEAM_PATH':
                        return input.groupPolicy?.team?.path;
                    case 'PRA_SYNC_API_GROUP_POLICY_JUMPOINT_PATH':
                        return input.groupPolicy?.jumpoint.path;
                    case 'PRA_SYNC_API_TEAM_PATH':
                        return input.team?.path;
                    case 'PRA_SYNC_API_TEAM_USER_PATH':
                        return input.team?.user?.path;
                    case 'PRA_SYNC_API_JUMP_GROUP_PATH':
                        return input.jumpGroup?.path;
                    case 'PRA_SYNC_API_JUMP_POLICY_PATH':
                        return input.jumpPolicy?.path;
                    case 'PRA_SYNC_API_JUMPOINT_PATH':
                        return input.jumpoint?.path;
                    case 'PRA_SYNC_API_JUMPOINT_NODE_PATH':
                        return input.jumpoint?.node?.path;
                    case 'PRA_SYNC_API_JUMPOINT_INSTALLER_PATH':
                        return input.jumpoint?.installer?.path;
                    case 'PRA_SYNC_API_JUMP_ITEM_REMOTE_RDP_PATH':
                        return input.jumpItem?.remoteRdp?.path;
                    case 'PRA_SYNC_API_JUMP_ITEM_COPY_REMOTE_RDP':
                        return input.jumpItem?.remoteRdp?.copy;
                    case 'PRA_SYNC_API_JUMP_ITEM_SHELL_JUMP_PATH':
                        return input.jumpItem?.shellJump?.path;
                    case 'PRA_SYNC_API_JUMP_ITEM_COPY_SHELL_JUMP':
                        return input.jumpItem?.shellJump?.copy;
                    case 'PRA_SYNC_API_JUMP_ITEM_WEB_JUMP_PATH':
                        return input.jumpItem?.webJump?.path;
                    case 'PRA_SYNC_API_JUMP_ITEM_COPY_WEB_JUMP':
                        return input.jumpItem?.webJump?.copy;
                    case 'PRA_SYNC_API_JUMP_ITEM_REMOTE_VNC_PATH':
                        return input.jumpItem?.remoteVnc?.path;
                    case 'PRA_SYNC_API_JUMP_ITEM_COPY_REMOTE_VNC':
                        return input.jumpItem?.remoteVnc?.copy;
                    case 'PRA_SYNC_API_JUMP_ITEM_PROTOCOL_TUNNEL_JUMP_PATH':
                        return input.jumpItem?.protocolTunnelJump?.path;
                    case 'PRA_SYNC_API_JUMP_ITEM_COPY_PROTOCOL_TUNNEL_JUMP':
                        return input.jumpItem?.protocolTunnelJump?.copy;
                    case 'PRA_SYNC_API_DISCREPANCY_PATH':
                        return input.discrepancy?.path;
                    case 'PRA_SYNC_API_DISCREPANCY_SCAN_PATH':
                        return input.discrepancy?.scan?.path;
                    case 'PRA_SYNC_API_DISCREPANCY_SCAN_ALL':
                        return input.discrepancy?.scan?.all;
                    case 'PRA_SYNC_API_DISCREPANCY_SYNC_PATH':
                        return input.discrepancy?.sync?.path;
                    default:
                        return undefined;
                }
            });

            expect(service.praSyncApi).toEqual({
                baseUrl: expected.baseUrl,
                beyondtrustInstance: {
                    path: expected.beyondtrustInstance?.path,
                    backup: {
                        path: expected.beyondtrustInstance?.backup?.path,
                    },
                },
                user: {
                    path: expected.user?.path,
                    groupPolicy: {
                        path: expected.user?.groupPolicy?.path,
                    },
                },
                jumpClient: {
                    path: expected.jumpClient?.path,
                    copy: expected.jumpClient?.copy,
                    installer: {
                        path: expected.jumpClient?.installer?.path,
                        platform: {
                            path: expected.jumpClient?.installer?.platform?.path,
                        },
                    },
                },
                groupPolicy: {
                    path: expected.groupPolicy?.path,
                    jumpoint: {
                        path: expected.groupPolicy?.jumpoint.path,
                    },
                    jumpGroup: {
                        path: expected.groupPolicy?.jumpGroup?.path,
                    },
                    member: {
                        path: expected.groupPolicy?.member?.path,
                    },
                    team: {
                        path: expected.groupPolicy?.team?.path,
                    },
                },
                team: {
                    path: expected.team?.path,
                    user: {
                        path: expected.team?.user.path,
                    },
                },
                jumpGroup: {
                    path: expected.jumpGroup?.path,
                },
                jumpPolicy: {
                    path: expected.jumpPolicy?.path,
                },
                jumpoint: {
                    path: expected.jumpoint?.path,
                    node: {
                        path: expected.jumpoint?.node?.path,
                    },
                    installer: {
                        path: expected.jumpoint?.installer?.path,
                    },
                },
                jumpItem: {
                    remoteRdp: {
                        path: expected.jumpItem?.remoteRdp?.path,
                        copy: expected.jumpItem?.remoteRdp?.copy,
                    },
                    shellJump: {
                        path: expected.jumpItem?.shellJump?.path,
                        copy: expected.jumpItem?.shellJump?.copy,
                    },
                    webJump: {
                        path: expected.jumpItem?.webJump?.path,
                        copy: expected.jumpItem?.webJump?.copy,
                    },
                    remoteVnc: {
                        path: expected.jumpItem?.remoteVnc?.path,
                        copy: expected.jumpItem?.remoteVnc?.copy,
                    },
                    protocolTunnelJump: {
                        path: expected.jumpItem?.protocolTunnelJump?.path,
                        copy: expected.jumpItem?.protocolTunnelJump?.copy,
                    },
                },
                discrepancy: {
                    path: expected.discrepancy?.path,
                    scan: {
                        path: expected.discrepancy?.scan?.path,
                        all: expected.discrepancy?.scan?.all,
                    },
                    sync: {
                        path: expected.discrepancy?.sync?.path,
                    },
                },
            });
        });
    });

    describe('database', () => {
        it.each([
            {
                input: {
                    env: 'production',
                    type: 'mysql',
                    host: 'localhost',
                    port: 3306,
                    username: 'root',
                    password: 'password',
                    database: 'test',
                    retryAttempts: 30,
                    retryDelayInMs: 5000,
                    maxQueryExecutionTimeInMs: 1000,
                },
                expected: {
                    type: 'mysql',
                    host: 'localhost',
                    port: 3306,
                    username: 'root',
                    password: 'password',
                    database: 'test',
                    synchronize: false,
                    logging: false,
                    autoLoadEntities: true,
                    retryAttempts: 30,
                    retryDelayInMs: 5000,
                    maxQueryExecutionTimeInMs: 1000,
                },
            },
            {
                input: {
                    env: 'test',
                },
                expected: {
                    type: undefined,
                    host: 'unknown',
                    port: 0,
                    username: 'unknown',
                    password: 'unknown',
                    database: 'unknown',
                    synchronize: true,
                    logging: false,
                    autoLoadEntities: true,
                    retryAttempts: 60,
                    retryDelayInMs: 8000,
                    maxQueryExecutionTimeInMs: 15000,
                },
            },
        ])('should return the database configuration as expected', ({ input, expected }) => {
            configService.get = jest.fn().mockImplementation((key: string) => {
                switch (key) {
                    case 'ENV':
                        return input.env;
                    case 'DB_TYPE':
                        return input.type;
                    case 'DB_HOST':
                        return input.host;
                    case 'DB_PORT':
                        return input.port;
                    case 'DB_USERNAME':
                        return input.username;
                    case 'DB_PASSWORD':
                        return input.password;
                    case 'DB_NAME':
                        return input.database;
                    case 'DB_RETRY_ATTEMPTS':
                        return input.retryAttempts;
                    case 'DB_RETRY_DELAY_IN_MS':
                        return input.retryDelayInMs;
                    case 'DB_MAX_QUERY_EXECUTION_TIME_IN_MS':
                        return input.maxQueryExecutionTimeInMs;
                    default:
                        return undefined;
                }
            });

            expect(service.database).toEqual({
                type: expected.type,
                host: expected.host,
                port: expected.port,
                username: expected.username,
                password: expected.password,
                database: expected.database,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                entities: expect.anything(),
                synchronize: expected.synchronize,
                logging: expected.logging,
                autoLoadEntities: expected.autoLoadEntities,
                retryAttempts: expected.retryAttempts,
                retryDelay: expected.retryDelayInMs,
                maxQueryExecutionTime: expected.maxQueryExecutionTimeInMs,
            });
        });
    });

    describe('storage', () => {
        it.each([
            {
                input: {
                    rootPath: 'root/path',
                    beyondTrustBackupPath: 'https://backup.api.url',
                },
                expected: {
                    rootPath: 'root/path',
                    beyondTrustBackupPath: 'https://backup.api.url',
                },
            },
        ])('should return the storage configuration as expected', ({ input, expected }) => {
            configService.get = jest.fn().mockImplementation((key: string) => {
                if (key === 'STORAGE_ROOT_PATH') {
                    return input.rootPath;
                }
                if (key === 'STORAGE_BEYONDTRUST_BACKUP_PATH') {
                    return input.beyondTrustBackupPath;
                }

                return undefined;
            });

            expect(service.storage).toEqual({
                rootPath: expected.rootPath,
                beyondTrustBackupPath: expected.beyondTrustBackupPath,
            });
        });
    });

    describe('site', () => {
        it.each([
            {
                input: {
                    groupPolicy: {
                        managerPrefix: 'MANAGER',
                        operatorPrefix: 'OPERATOR',
                        administratorPrefix: 'ADMINISTRATOR',
                        marlink: {
                            superuser: 'MARLINK_SUPERUSER',
                            operator: 'MARLINK_OPERATOR',
                        },
                        managerAccess: 'MANAGER_ACCESS',
                        administratorAccess: 'ADMINISTRATOR_ACCESS',
                        adminOperatorAccess: 'ADMIN_OPERATOR_ACCESS',
                        limitedAccess: 'LIMITED_ACCESS',
                        fullAccess: 'FULL_ACCESS',
                    },
                    user: {
                        siteManager: {
                            publicDisplayNamePrefix: 'SITE_MANAGER',
                        },
                        siteAuditor: {
                            publicDisplayNamePrefix: 'SITE_AUDITOR',
                        },
                    },
                    jumpPolicy: {
                        authSuffix: 'AUTH',
                        noAuthSuffix: 'NO_AUTH',
                        notifySuffix: 'NOTIFY',
                        notificationDisplayNamePrefix: 'NOTIFICATION',
                        approvalDisplayNamePrefix: 'APPROVAL',
                    },
                    jumpoint: {
                        prefix: 'JUMPOINT',
                    },
                },
                expected: {
                    groupPolicy: {
                        managerPrefix: 'MANAGER',
                        operatorPrefix: 'OPERATOR',
                        administratorPrefix: 'ADMINISTRATOR',
                        marlink: {
                            superuser: 'MARLINK_SUPERUSER',
                            operator: 'MARLINK_OPERATOR',
                        },
                        managerAccess: 'MANAGER_ACCESS',
                        administratorAccess: 'ADMINISTRATOR_ACCESS',
                        adminOperatorAccess: 'ADMIN_OPERATOR_ACCESS',
                        limitedAccess: 'LIMITED_ACCESS',
                        fullAccess: 'FULL_ACCESS',
                    },
                    user: {
                        siteManager: {
                            publicDisplayNamePrefix: 'SITE_MANAGER',
                        },
                        siteAuditor: {
                            publicDisplayNamePrefix: 'SITE_AUDITOR',
                        },
                    },
                    jumpPolicy: {
                        authSuffix: 'AUTH',
                        noAuthSuffix: 'NO_AUTH',
                        notifySuffix: 'NOTIFY',
                        notificationDisplayNamePrefix: 'NOTIFICATION',
                        approvalDisplayNamePrefix: 'APPROVAL',
                    },
                    jumpoint: {
                        prefix: 'JUMPOINT',
                    },
                },
            },
            {
                input: {},
                expected: {
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
                },
            },
        ])('should return the site configuration as expected', ({ input, expected }) => {
            configService.get = jest.fn().mockImplementation((key: string) => {
                switch (key) {
                    case 'SITE_GROUP_POLICY_MANAGER_PREFIX':
                        return input.groupPolicy?.managerPrefix;
                    case 'SITE_GROUP_POLICY_OPERATOR_PREFIX':
                        return input.groupPolicy?.operatorPrefix;
                    case 'SITE_GROUP_POLICY_ADMINISTRATOR_PREFIX':
                        return input.groupPolicy?.administratorPrefix;
                    case 'SITE_GROUP_POLICY_MARLINK_SUPERUSER':
                        return input.groupPolicy?.marlink?.superuser;
                    case 'SITE_GROUP_POLICY_MARLINK_OPERATOR':
                        return input.groupPolicy?.marlink?.operator;
                    case 'SITE_GROUP_POLICY_MANAGER_ACCESS':
                        return input.groupPolicy?.managerAccess;
                    case 'SITE_GROUP_POLICY_ADMINISTRATOR_ACCESS':
                        return input.groupPolicy?.administratorAccess;
                    case 'SITE_GROUP_POLICY_ADMIN_OPERATOR_ACCESS':
                        return input.groupPolicy?.adminOperatorAccess;
                    case 'SITE_GROUP_POLICY_LIMITED_ACCESS':
                        return input.groupPolicy?.limitedAccess;
                    case 'SITE_GROUP_POLICY_FULL_ACCESS':
                        return input.groupPolicy?.fullAccess;
                    case 'SITE_USER_SITE_MANAGER_PUBLIC_DISPLAY_NAME_PREFIX':
                        return input.user?.siteManager?.publicDisplayNamePrefix;
                    case 'SITE_USER_SITE_AUDITOR_PUBLIC_DISPLAY_NAME_PREFIX':
                        return input.user?.siteAuditor?.publicDisplayNamePrefix;
                    case 'SITE_JUMP_POLICY_AUTH_SUFFIX':
                        return input.jumpPolicy?.authSuffix;
                    case 'SITE_JUMP_POLICY_NO_AUTH_SUFFIX':
                        return input.jumpPolicy?.noAuthSuffix;
                    case 'SITE_JUMP_POLICY_NOTIFY_SUFFIX':
                        return input.jumpPolicy?.notifySuffix;
                    case 'SITE_JUMP_POLICY_NOTIFICATION_DISPLAY_NAME_PREFIX':
                        return input.jumpPolicy?.notificationDisplayNamePrefix;
                    case 'SITE_JUMP_POLICY_APPROVAL_DISPLAY_NAME_PREFIX':
                        return input.jumpPolicy?.approvalDisplayNamePrefix;
                    case 'SITE_JUMPOINT_PREFIX':
                        return input.jumpoint?.prefix;
                    default:
                        return undefined;
                }
            });

            expect(service.site).toEqual({
                groupPolicy: {
                    managerPrefix: expected.groupPolicy.managerPrefix,
                    operatorPrefix: expected.groupPolicy.operatorPrefix,
                    administratorPrefix: expected.groupPolicy.administratorPrefix,
                    marlink: {
                        superuser: expected.groupPolicy.marlink.superuser,
                        operator: expected.groupPolicy.marlink.operator,
                    },
                    managerAccess: expected.groupPolicy.managerAccess,
                    administratorAccess: expected.groupPolicy.administratorAccess,
                    adminOperatorAccess: expected.groupPolicy.adminOperatorAccess,
                    limitedAccess: expected.groupPolicy.limitedAccess,
                    fullAccess: expected.groupPolicy.fullAccess,
                },
                user: {
                    siteManager: {
                        publicDisplayNamePrefix: expected.user.siteManager.publicDisplayNamePrefix,
                    },
                    siteAuditor: {
                        publicDisplayNamePrefix: expected.user.siteAuditor.publicDisplayNamePrefix,
                    },
                },
                jumpPolicy: {
                    authSuffix: expected.jumpPolicy.authSuffix,
                    noAuthSuffix: expected.jumpPolicy.noAuthSuffix,
                    notifySuffix: expected.jumpPolicy.notifySuffix,
                    notificationDisplayNamePrefix: expected.jumpPolicy.notificationDisplayNamePrefix,
                    approvalDisplayNamePrefix: expected.jumpPolicy.approvalDisplayNamePrefix,
                },
                jumpoint: {
                    prefix: expected.jumpoint.prefix,
                },
            });
        });
    });

    describe('customer', () => {
        it.each([
            {
                input: {
                    groupPolicy: {
                        administratorPrefix: 'ADMINISTRATOR',
                    },
                },
                expected: {
                    groupPolicy: {
                        administratorPrefix: 'ADMINISTRATOR',
                    },
                },
            },
            {
                input: {},
                expected: {
                    groupPolicy: {
                        administratorPrefix: 'ADMINISTRATORS_',
                    },
                },
            },
        ])('should return the customer configuration as expected', ({ input, expected }) => {
            configService.get = jest.fn().mockImplementation((key: string) => {
                switch (key) {
                    case 'CUSTOMER_GROUP_POLICY_ADMINISTRATOR_PREFIX':
                        return input.groupPolicy?.administratorPrefix;
                    default:
                        return undefined;
                }
            });

            expect(service.customer).toEqual({
                groupPolicy: {
                    administratorPrefix: expected.groupPolicy.administratorPrefix,
                },
            });
        });
    });

    describe('smtp', () => {
        it.each([
            {
                input: {
                    username: 'your_smtp_username',
                    password: 'your_smtp_password',
                    host: 'smtp.example.com',
                    port: 587,
                },
                expected: {
                    username: 'your_smtp_username',
                    password: 'your_smtp_password',
                    host: 'smtp.example.com',
                    port: 587,
                },
            },
            {
                input: {},
                expected: {
                    username: 'unknown',
                    password: 'unknown',
                    host: 'unknown',
                    port: 0,
                },
            },
        ])('should return the SMTP configuration as expected', ({ input, expected }) => {
            configService.get = jest.fn().mockImplementation((key: string) => {
                switch (key) {
                    case 'SMTP_USERNAME':
                        return input.username;
                    case 'SMTP_PASSWORD':
                        return input.password;
                    case 'SMTP_HOST':
                        return input.host;
                    case 'SMTP_PORT':
                        return input.port;
                    default:
                        return undefined;
                }
            });

            expect(service.smtp).toEqual({
                username: expected.username,
                password: expected.password,
                host: expected.host,
                port: expected.port,
            });
        });
    });

    describe('cronJob', () => {
        it.each([
            {
                input: {
                    timezone: 'Europe/Berlin',
                    retryAttempts: 5,
                    retryDelayInMs: 10000,
                    btInstanceBackup: '0 10 * * *',
                    btDataPopulationIfEmpty: '*/45 * * * *',
                },
                expected: {
                    timezone: 'Europe/Berlin',
                    retryAttempts: 5,
                    retryDelayInMs: 10000,
                    btInstanceBackup: '0 10 * * *',
                    btDataPopulationIfEmpty: '*/45 * * * *',
                },
            },
            {
                input: {},
                expected: {
                    timezone: 'Europe/Berlin',
                    retryAttempts: 5,
                    retryDelayInMs: 10000,
                    btInstanceBackup: '35 2 * * *',
                    btDataPopulationIfEmpty: '0 */3 * * *',
                },
            },
        ])('should return the sync configuration as expected', ({ input, expected }) => {
            configService.get = jest.fn().mockImplementation((key: string) => {
                if (key === 'CRON_JOB_TIMEZONE') {
                    return input.timezone;
                }
                if (key === 'CRON_JOB_RETRY_ATTEMPTS') {
                    return input.retryAttempts;
                }
                if (key === 'CRON_JOB_RETRY_DELAY_IN_MS') {
                    return input.retryDelayInMs;
                }
                if (key === 'CRON_JOB_BT_INSTANCE_BACKUP') {
                    return input.btInstanceBackup;
                }
                if (key === 'CRON_JOB_BT_DATA_POPULATION_IF_EMPTY') {
                    return input.btDataPopulationIfEmpty;
                }

                return undefined;
            });

            expect(service.cronJob).toEqual({
                timezone: expected.timezone,
                retryAttempts: expected.retryAttempts,
                retryDelayInMs: expected.retryDelayInMs,
                btInstanceBackup: expected.btInstanceBackup,
                btDataPopulationIfEmpty: expected.btDataPopulationIfEmpty,
            });
        });
    });

    describe('throttle', () => {
        it.each([
            {
                input: {
                    isEnabled: false,
                    ttlInMs: 120,
                    limit: 1000,
                },
                expected: {
                    isEnabled: false,
                    ttlInMs: 120,
                    limit: 1000,
                },
            },
            {
                input: {},
                expected: {
                    isEnabled: true,
                    ttlInMs: 60000,
                    limit: 1500,
                },
            },
        ])('should return the throttle configuration as expected', ({ input, expected }) => {
            configService.get = jest.fn().mockImplementation((key: string) => {
                if (key === 'THROTTLE_IS_ENABLED') {
                    return input.isEnabled;
                }

                if (key === 'THROTTLE_TTL_IN_MS') {
                    return input.ttlInMs;
                }
                if (key === 'THROTTLE_LIMIT') {
                    return input.limit;
                }

                return undefined;
            });

            expect(service.throttle).toEqual({
                isEnabled: expected.isEnabled,
                ttlInMs: expected.ttlInMs,
                limit: expected.limit,
            });
        });
    });
});

function mockConfigService() {
    const service = {} as ConfigService;
    service.get = jest.fn();

    return service;
}

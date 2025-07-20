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
                expected: 3000,
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
                    memoryHeapUsageThresholdInMB: 256,
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
                },
            },
            {
                input: {},
                expected: {
                    baseUrl: 'unknown',
                    beyondtrustInstance: {
                        path: 'unknown',
                        backup: {
                            path: 'unknown',
                        },
                    },
                    user: {
                        path: 'unknown',
                        groupPolicy: {
                            path: 'unknown',
                        },
                    },
                    jumpClient: {
                        path: 'unknown',
                        copy: 'unknown',
                        installer: {
                            path: 'unknown',
                        },
                    },
                    groupPolicy: {
                        path: 'unknown',
                        jumpoint: {
                            path: 'unknown',
                        },
                        jumpGroup: {
                            path: 'unknown',
                        },
                        member: {
                            path: 'unknown',
                        },
                        team: {
                            path: 'unknown',
                        },
                    },
                    team: {
                        path: 'unknown',
                        user: {
                            path: 'unknown',
                        },
                    },
                    jumpGroup: {
                        path: 'unknown',
                    },
                    jumpPolicy: {
                        path: 'unknown',
                    },
                    jumpoint: {
                        path: 'unknown',
                    },
                    jumpItem: {
                        remoteRdp: {
                            path: 'unknown',
                            copy: 'unknown',
                        },
                        shellJump: {
                            path: 'unknown',
                            copy: 'unknown',
                        },
                        webJump: {
                            path: 'unknown',
                            copy: 'unknown',
                        },
                        remoteVnc: {
                            path: 'unknown',
                            copy: 'unknown',
                        },
                        protocolTunnelJump: {
                            path: 'unknown',
                            copy: 'unknown',
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
                        siteAdministrator: {
                            publicDisplayNamePrefix: 'SITE_ADMINISTRATOR',
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
                        siteAdministrator: {
                            publicDisplayNamePrefix: 'SITE_ADMINISTRATOR',
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
                        managerPrefix: 'unknown',
                        operatorPrefix: 'unknown',
                        administratorPrefix: 'unknown',
                        marlink: {
                            superuser: 'unknown',
                            operator: 'unknown',
                        },
                        managerAccess: 'unknown',
                        administratorAccess: 'unknown',
                        adminOperatorAccess: 'unknown',
                        limitedAccess: 'unknown',
                        fullAccess: 'unknown',
                    },
                    user: {
                        siteManager: {
                            publicDisplayNamePrefix: 'unknown',
                        },
                        siteAdministrator: {
                            publicDisplayNamePrefix: 'unknown',
                        },
                    },
                    jumpPolicy: {
                        authSuffix: 'unknown',
                        noAuthSuffix: 'unknown',
                        notifySuffix: 'unknown',
                        notificationDisplayNamePrefix: 'unknown',
                        approvalDisplayNamePrefix: 'unknown',
                    },
                    jumpoint: {
                        prefix: 'unknown',
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
                    case 'SITE_USER_SITE_ADMINISTRATOR_PUBLIC_DISPLAY_NAME_PREFIX':
                        return input.user?.siteAdministrator?.publicDisplayNamePrefix;
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
                    siteAdministrator: {
                        publicDisplayNamePrefix: expected.user.siteAdministrator.publicDisplayNamePrefix,
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
                        administratorPrefix: 'unknown',
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
});

function mockConfigService() {
    const service = {} as ConfigService;
    service.get = jest.fn();

    return service;
}

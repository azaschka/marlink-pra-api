import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
    let service: AppConfigService;
    let configService: ConfigService;

    beforeEach(() => {
        configService = mockConfigService();
        service = new AppConfigService(configService);
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
                    user: {
                        path: 'api-path-user-1',
                        groupPolicies: {
                            path: 'api-path-user-group-policies-1',
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
                    user: {
                        path: 'api-path-user-1',
                        groupPolicies: {
                            path: 'api-path-user-group-policies-1',
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
                    user: {
                        path: 'unknown',
                        groupPolicies: {
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
                    case 'PRA_SYNC_API_USER_PATH':
                        return input.user?.path;
                    case 'PRA_SYNC_API_USER_GROUP_POLICIES_PATH':
                        return input.user?.groupPolicies.path;
                    case 'PRA_SYNC_API_JUMP_CLIENT_PATH':
                        return input.jumpClient?.path;
                    case 'PRA_SYNC_API_COPY_JUMP_CLIENT':
                        return input.jumpClient?.copy;
                    case 'PRA_SYNC_API_JUMP_CLIENT_INSTALLER_PATH':
                        return input.jumpClient?.installer?.path;
                    case 'PRA_SYNC_API_GROUP_POLICY_PATH':
                        return input.groupPolicy?.path;
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
                user: {
                    path: expected.user?.path,
                    groupPolicies: {
                        path: expected.user?.groupPolicies.path,
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
                    logging: true,
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

    describe('customer', () => {
        it.each([
            {
                input: {
                    groupPolicy: {
                        adminPrefix: 'ADMINISTRATOR',
                    },
                },
                expected: {
                    groupPolicy: {
                        adminPrefix: 'ADMINISTRATOR',
                    },
                },
            },
            {
                input: {},
                expected: {
                    groupPolicy: {
                        adminPrefix: 'unknown',
                    },
                },
            },
        ])('should return the customer configuration as expected', ({ input, expected }) => {
            configService.get = jest.fn().mockImplementation((key: string) => {
                switch (key) {
                    case 'CUSTOMER_GROUP_POLICY_ADMIN_PREFIX':
                        return input.groupPolicy?.adminPrefix;
                    default:
                        return undefined;
                }
            });

            expect(service.customer).toEqual({
                groupPolicy: {
                    adminPrefix: expected.groupPolicy.adminPrefix,
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

import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { AppConfigService } from '../../../../app-config/services/app-config.service';
import { RemoteRdp } from '../../models';
import { ModifyRemoteRdpCommand } from '../modify-remote-rdp.command';
import { ModifyRemoteRdpCommandHandler } from './modify-remote-rdp.command-handler';

describe('ModifyRemoteRdpCommandHandler', () => {
    let appConfigService: AppConfigService;
    let httpService: HttpService;
    let handler: ModifyRemoteRdpCommandHandler;

    beforeEach(() => {
        appConfigService = mockAppConfigService();
        httpService = mockHttpService();
        handler = new ModifyRemoteRdpCommandHandler(appConfigService, httpService);
    });

    describe('execute', () => {
        it('should always patch mustIgnoreUntrustedServerCert: true, even when the command omits it', async () => {
            // Arrange
            const expectedResult = { id: 1 } as RemoteRdp;
            const httpServicePatchMethod = jest
                .spyOn(httpService, 'patch')
                .mockReturnValue(of({ data: expectedResult } as AxiosResponse<RemoteRdp>));

            const command = new ModifyRemoteRdpCommand(
                'transaction-1',
                123,
                1,
                'name-1',
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined, // mustIgnoreUntrustedServerCert omitted
            );

            // Act
            const result = await handler.execute(command);

            // Assert
            expect(httpServicePatchMethod).toHaveBeenCalledWith(
                'https://pra-sync-api.example.com/jump-item/remote-rdp/1',
                expect.objectContaining({ mustIgnoreUntrustedServerCert: true }),
                expect.any(Object),
            );
            expect(result).toBe(expectedResult);
        });

        it('should override mustIgnoreUntrustedServerCert to true when the client explicitly sends false', async () => {
            // Arrange
            const expectedResult = { id: 2 } as RemoteRdp;
            const httpServicePatchMethod = jest
                .spyOn(httpService, 'patch')
                .mockReturnValue(of({ data: expectedResult } as AxiosResponse<RemoteRdp>));

            const command = new ModifyRemoteRdpCommand(
                'transaction-1',
                123,
                1,
                'name-1',
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                false, // mustIgnoreUntrustedServerCert explicitly false
            );

            // Act
            const result = await handler.execute(command);

            // Assert
            expect(httpServicePatchMethod).toHaveBeenCalledWith(
                'https://pra-sync-api.example.com/jump-item/remote-rdp/1',
                expect.objectContaining({ mustIgnoreUntrustedServerCert: true }),
                expect.any(Object),
            );
            expect(result).toBe(expectedResult);
        });

        it('should not forward transactionId or id in the outbound payload', async () => {
            // Arrange
            const expectedResult = { id: 3 } as RemoteRdp;
            const httpServicePatchMethod = jest
                .spyOn(httpService, 'patch')
                .mockReturnValue(of({ data: expectedResult } as AxiosResponse<RemoteRdp>));

            const command = new ModifyRemoteRdpCommand('transaction-1', 123, 1, 'name-1');

            // Act
            await handler.execute(command);

            // Assert
            const [, payload] = httpServicePatchMethod.mock.calls[0] as [string, Record<string, unknown>];
            expect(payload).not.toHaveProperty('transactionId');
            expect(payload).not.toHaveProperty('id');
        });

        it('should throw a processed error when the outbound request fails', async () => {
            // Arrange
            jest.spyOn(httpService, 'patch').mockReturnValue(throwError(() => new Error('network error')));

            const command = new ModifyRemoteRdpCommand('transaction-1', 123, 1, 'name-1');

            // Act & Assert
            await expect(handler.execute(command)).rejects.toThrow();
        });
    });
});

function mockAppConfigService() {
    const appConfigService = {} as AppConfigService;
    Object.defineProperty(appConfigService, 'praSyncApi', {
        get: () => ({
            baseUrl: 'https://pra-sync-api.example.com',
            jumpItem: {
                remoteRdp: {
                    path: 'jump-item/remote-rdp',
                    copy: 'copy',
                },
            },
        }),
    });

    return appConfigService;
}

function mockHttpService() {
    const httpService = {} as HttpService;
    httpService.patch = jest.fn();

    return httpService;
}

import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { AppConfigService } from '../../../../app-config/services/app-config.service';
import { RemoteRdp } from '../../models';
import { CreateRemoteRdpCommand } from '../create-remote-rdp.command';
import { CreateRemoteRdpCommandHandler } from './create-remote-rdp.command-handler';

describe('CreateRemoteRdpCommandHandler', () => {
    let appConfigService: AppConfigService;
    let httpService: HttpService;
    let handler: CreateRemoteRdpCommandHandler;

    beforeEach(() => {
        appConfigService = mockAppConfigService();
        httpService = mockHttpService();
        handler = new CreateRemoteRdpCommandHandler(appConfigService, httpService);
    });

    describe('execute', () => {
        it('should always post mustIgnoreUntrustedServerCert: true, even when the command omits it', async () => {
            // Arrange
            const expectedResult = { id: 1 } as RemoteRdp;
            const httpServicePostMethod = jest
                .spyOn(httpService, 'post')
                .mockReturnValue(of({ data: expectedResult } as AxiosResponse<RemoteRdp>));

            const command = new CreateRemoteRdpCommand(
                'transaction-1',
                123,
                'name-1',
                1,
                'hostname-1',
                2,
                undefined,
                undefined,
                undefined,
                undefined, // mustIgnoreUntrustedServerCert omitted
            );

            // Act
            const result = await handler.execute(command);

            // Assert
            expect(httpServicePostMethod).toHaveBeenCalledWith(
                'https://pra-sync-api.example.com/jump-item/remote-rdp',
                expect.objectContaining({ mustIgnoreUntrustedServerCert: true }),
                expect.any(Object),
            );
            expect(result).toBe(expectedResult);
        });

        it('should override mustIgnoreUntrustedServerCert to true when the client explicitly sends false', async () => {
            // Arrange
            const expectedResult = { id: 2 } as RemoteRdp;
            const httpServicePostMethod = jest
                .spyOn(httpService, 'post')
                .mockReturnValue(of({ data: expectedResult } as AxiosResponse<RemoteRdp>));

            const command = new CreateRemoteRdpCommand(
                'transaction-1',
                123,
                'name-1',
                1,
                'hostname-1',
                2,
                undefined,
                undefined,
                undefined,
                false, // mustIgnoreUntrustedServerCert explicitly false
            );

            // Act
            const result = await handler.execute(command);

            // Assert
            expect(httpServicePostMethod).toHaveBeenCalledWith(
                'https://pra-sync-api.example.com/jump-item/remote-rdp',
                expect.objectContaining({ mustIgnoreUntrustedServerCert: true }),
                expect.any(Object),
            );
            expect(result).toBe(expectedResult);
        });

        it('should not forward transactionId in the outbound payload', async () => {
            // Arrange
            const expectedResult = { id: 3 } as RemoteRdp;
            const httpServicePostMethod = jest
                .spyOn(httpService, 'post')
                .mockReturnValue(of({ data: expectedResult } as AxiosResponse<RemoteRdp>));

            const command = new CreateRemoteRdpCommand('transaction-1', 123, 'name-1', 1, 'hostname-1', 2);

            // Act
            await handler.execute(command);

            // Assert
            const [, payload] = httpServicePostMethod.mock.calls[0] as [string, Record<string, unknown>];
            expect(payload).not.toHaveProperty('transactionId');
        });

        it('should throw a processed error when the outbound request fails', async () => {
            // Arrange
            jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => new Error('network error')));

            const command = new CreateRemoteRdpCommand('transaction-1', 123, 'name-1', 1, 'hostname-1', 2);

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
    httpService.post = jest.fn();

    return httpService;
}

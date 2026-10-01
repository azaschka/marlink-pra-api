/* eslint-disable @typescript-eslint/naming-convention -- HTTP header names */
import { HttpModule } from '@nestjs/axios';
import { HttpException, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import { Writable } from 'stream';
import { AppConfigModule } from '../../app-config/app-config.module';
import { DefaultAppConfig } from '../../app-config/consts/default-app-config.const';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { CreateBeyondtrustInstanceBackupCommand } from '../../beyondtrust-instance-backup/commands';
import { CreateBeyondtrustInstanceBackupCommandHandler } from '../../beyondtrust-instance-backup/commands/handlers/create-beyondtrust-instance-backup.command-handler';
import { DownloadJumpointNodeIsoCommand } from '../../deployment/jumpoint-node/commands';
import { DownloadJumpointNodeIsoCommandHandler } from '../../deployment/jumpoint-node/commands/handlers/download-jumpoint-node-iso.command-handler';
import { ScanDiscrepancyCommand, SyncAllExternalDiscrepanciesCommand } from '../../discrepancy/commands';
import { ScanDiscrepancyCommandHandler } from '../../discrepancy/commands/handlers/scan-discrepancy.command-handler';
import { SyncAllExternalDiscrepanciesCommandHandler } from '../../discrepancy/commands/handlers/sync-all-external-discrepancies.command-handler';
import { DiscrepancyEntityType } from '../../discrepancy/enums';
import { RetrieveJumpointInstallerQuery } from '../../jumpoint/queries';
import { RetrieveJumpointInstallerQueryHandler } from '../../jumpoint/queries/handlers/retrieve-jumpoint-installer.query-handler';
import { StreamIdleTimeoutError, SyncApiDownloadUtility } from '../../shared/utilities';
import { RetrieveTeamsQuery } from '../../team/queries';
import { RetrieveTeamsQueryHandler } from '../../team/queries/handlers/retrieve-teams.query-handler';
import { OutboundHttpModule } from '../outbound-http.module';

/**
 * Before STAB-13 PRA API called the Sync API without any timeout (axios default 0): a Sync API that accepted the
 * connection and never answered held the request forever. These tests run the real handlers through the real
 * HttpModule wiring against a local stub Sync API.
 */
describe('Outbound HTTP timeouts to the Sync API', () => {
    // downloadIdleInMs below defaultInMs, as in the defaults (120 s and 300 s), so that the explicit idle bound and
    // not the transport's socket timeout ends a stalled download.
    const timeouts = { defaultInMs: 300, scanInMs: 3000, fileTransferInMs: 3000, downloadIdleInMs: 150 };
    let server: Server;
    let handler: (req: IncomingMessage, res: ServerResponse) => void;
    let moduleRef: TestingModule;
    const originalTimeout = axios.defaults.timeout;

    beforeAll(async () => {
        server = createServer((req, res) => handler(req, res));
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

        moduleRef = await Test.createTestingModule({
            // Like every feature module: the plain HttpModule, plus the module that sets the default.
            imports: [AppConfigModule, HttpModule, OutboundHttpModule],
            providers: [
                RetrieveTeamsQueryHandler,
                ScanDiscrepancyCommandHandler,
                SyncAllExternalDiscrepanciesCommandHandler,
                CreateBeyondtrustInstanceBackupCommandHandler,
                DownloadJumpointNodeIsoCommandHandler,
                RetrieveJumpointInstallerQueryHandler,
            ],
        })
            .overrideProvider(AppConfigService)
            .useValue({ praSyncApi: { ...DefaultAppConfig.praSyncApi, baseUrl }, praSyncApiTimeouts: timeouts })
            .compile();

        // The axios default instance has no timeout until the module initialises.
        expect(axios.defaults.timeout).toBe(0);
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
        await moduleRef.init();
    });

    afterAll(async () => {
        axios.defaults.timeout = originalTimeout;
        await moduleRef?.close();
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
        jest.restoreAllMocks();
    });

    it('sets the configured default on the shared axios instance used by the plain HttpModule', () => {
        expect(axios.defaults.timeout).toBe(300);
    });

    it('fails a call that the Sync API never answers with 504 after the default timeout and closes the socket', async () => {
        let socketClosed = false;
        handler = (req) => req.socket.on('close', () => (socketClosed = true)); // never answers
        const startedAt = Date.now();

        const error = await moduleRef
            .get(RetrieveTeamsQueryHandler)
            .execute(new RetrieveTeamsQuery('tx', 1, 10, 1))
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(504);
        expect((error as HttpException).getResponse()).toBe('The PRA Sync API did not answer within 300 ms');
        expect(Date.now() - startedAt).toBeGreaterThanOrEqual(250);
        expect(Date.now() - startedAt).toBeLessThan(2000);
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(socketClosed).toBe(true);
    });

    describe('long-running calls keep their own, longer timeout', () => {
        beforeAll(() => {
            // Answers after 800 ms: beyond the default (300 ms), within the overrides (3000 ms).
            handler = (_req, res) =>
                setTimeout(() => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end('{"ok":true}');
                }, 800);
        });

        it('cuts an ordinary call at the default', async () => {
            await expect(
                moduleRef.get(RetrieveTeamsQueryHandler).execute(new RetrieveTeamsQuery('tx', 1, 10, 1)),
            ).rejects.toEqual(expect.objectContaining({ status: 504 }));
        });

        it.each([
            [
                'manual scan per entity type',
                () =>
                    moduleRef
                        .get(ScanDiscrepancyCommandHandler)
                        .execute(new ScanDiscrepancyCommand('tx', 1, DiscrepancyEntityType.User)),
            ],
            [
                'sync all external discrepancies',
                () =>
                    moduleRef
                        .get(SyncAllExternalDiscrepanciesCommandHandler)
                        .execute(new SyncAllExternalDiscrepanciesCommand('tx', 1)),
            ],
            [
                'backup creation',
                () =>
                    moduleRef
                        .get(CreateBeyondtrustInstanceBackupCommandHandler)
                        .execute(new CreateBeyondtrustInstanceBackupCommand('tx', 1)),
            ],
            [
                'jumpoint node ISO download',
                () =>
                    moduleRef
                        .get(DownloadJumpointNodeIsoCommandHandler)
                        .execute(new DownloadJumpointNodeIsoCommand('tx', 1)),
            ],
        ])('lets the %s finish', async (_name, run: () => Promise<unknown>) => {
            await expect(run()).resolves.toEqual({ ok: true });
        });
    });

    describe('installer downloads', () => {
        const collect = () => {
            const chunks: Buffer[] = [];
            const sink = new Writable({
                write(chunk: Buffer, _encoding, callback) {
                    chunks.push(chunk);
                    callback();
                },
            });

            return { sink, body: () => Buffer.concat(chunks).toString() };
        };

        it('does not cut a slow but moving body after the default timeout', async () => {
            handler = (_req, res) => {
                res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
                let sent = 0;
                const timer = setInterval(() => {
                    res.write(String(sent++));
                    if (sent === 8) {
                        clearInterval(timer);
                        res.end();
                    }
                }, 100); // 800 ms in total, never 300 ms without data
            };
            const target = collect();
            const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

            const response = await moduleRef
                .get(RetrieveJumpointInstallerQueryHandler)
                .execute(new RetrieveJumpointInstallerQuery('tx', 1, 7));
            await SyncApiDownloadUtility.forward(response.data, target.sink, new Logger('test'), 'download');

            expect(target.body()).toBe('01234567');
            expect(warn).not.toHaveBeenCalled();
        });

        it('passes the status of a Sync API error through to the caller', async () => {
            handler = (_req, res) => {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end('{"message":"Jumpoint not found"}');
            };

            const error = await moduleRef
                .get(RetrieveJumpointInstallerQueryHandler)
                .execute(new RetrieveJumpointInstallerQuery('tx', 1, 7))
                .catch((e: unknown) => e);

            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getStatus()).toBe(404);
        });

        it('ends a stalled body after the idle timeout, closes both sides and logs it', async () => {
            let socketClosed = false;
            handler = (req, res) => {
                res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': '1000000' });
                res.write('first bytes'); // then nothing
                req.socket.on('close', () => (socketClosed = true));
            };
            const target = collect();
            const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

            const response = await moduleRef
                .get(RetrieveJumpointInstallerQueryHandler)
                .execute(new RetrieveJumpointInstallerQuery('tx', 1, 7));
            await SyncApiDownloadUtility.forward(response.data, target.sink, new Logger('test'), 'Jumpoint download');

            expect(target.body()).toBe('first bytes');
            expect(target.sink.destroyed).toBe(true);
            expect(warn).toHaveBeenCalledWith(
                `Jumpoint download ended early: ${new StreamIdleTimeoutError(150, 'jumpoint installer 7').message}`,
            );
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(socketClosed).toBe(true);
        });
    });
});

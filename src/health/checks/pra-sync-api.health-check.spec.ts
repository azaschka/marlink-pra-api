/* eslint-disable @typescript-eslint/naming-convention -- HTTP header names */
import { HttpService } from '@nestjs/axios';
import axios from 'axios';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { HealthContributorRegistry } from '../../observability/services/health-contributor-registry.service';
import { PraSyncApiHealthCheck } from './pra-sync-api.health-check';

const legacyDetails = (overrides: Record<string, 'up' | 'down'> = {}) => {
    const details = { database: 'up', storage: 'up', memoryHeap: 'up', ...overrides };

    return Object.fromEntries(Object.entries(details).map(([name, status]) => [name, { status }]));
};

describe('PraSyncApiHealthCheck.interpret', () => {
    it.each([
        {
            name: 'new contract, healthy',
            httpStatus: 200,
            body: { status: 'ok', overallStatus: 'healthy', checks: { database: { status: 'up' } } },
            expected: { status: 'up', remoteOverallStatus: 'healthy' },
        },
        {
            name: 'new contract, sustained memory warning',
            httpStatus: 200,
            body: {
                status: 'ok',
                overallStatus: 'degraded',
                checks: { database: { status: 'up' }, memoryHeap: { status: 'warning' } },
            },
            expected: { status: 'warning', remoteWarnings: ['memoryHeap'] },
        },
        {
            name: 'new contract, database down',
            httpStatus: 503,
            body: { status: 'error', overallStatus: 'unavailable', checks: { database: { status: 'down' } } },
            expected: { status: 'down', remoteOverallStatus: 'unavailable' },
        },
        {
            name: 'old Sync API, everything up',
            httpStatus: 200,
            body: { status: 'ok', details: legacyDetails() },
            expected: { status: 'up' },
        },
        {
            name: 'old Sync API, 503 only because of memoryHeap (wrapped by its exception filter)',
            httpStatus: 503,
            body: { statusCode: 503, message: { status: 'error', details: legacyDetails({ memoryHeap: 'down' }) } },
            expected: { status: 'warning', remoteWarnings: ['memoryHeap'] },
        },
        {
            name: 'old Sync API, database down',
            httpStatus: 503,
            body: { status: 'error', details: legacyDetails({ database: 'down' }) },
            expected: { status: 'down' },
        },
        {
            name: 'an HTML error page',
            httpStatus: 502,
            body: '<html><title>502 Bad Gateway</title></html>',
            expected: { status: 'down', message: 'Unexpected answer from the Sync API (HTTP 502)' },
        },
    ])('$name', ({ httpStatus, body, expected }) => {
        expect(PraSyncApiHealthCheck.interpret(httpStatus, body)).toEqual(expect.objectContaining(expected));
    });
});

describe('PraSyncApiHealthCheck against a local Sync API stub', () => {
    let server: Server;
    let answer: (res: import('http').ServerResponse) => void;
    let requests: number;

    beforeAll(async () => {
        server = createServer((_req, res) => {
            requests++;
            answer(res);
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    });

    afterAll(async () => {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    beforeEach(() => {
        requests = 0;
    });

    const create = (url: string) =>
        new PraSyncApiHealthCheck(
            new HttpService(axios.create({ proxy: false })),
            { health: { pingCheckPraSyncApiUrl: url } } as AppConfigService,
            new HealthContributorRegistry(),
        );
    const url = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}/health`;

    it('reads the body of a 503 instead of treating every 503 as down', async () => {
        answer = (res) => {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(
                JSON.stringify({
                    statusCode: 503,
                    message: { status: 'error', details: legacyDetails({ memoryHeap: 'down' }) },
                }),
            );
        };

        const check = await create(url()).check();

        expect(check).toEqual(expect.objectContaining({ status: 'warning', critical: false, reachable: true }));
    });

    it('asks the Sync API at most once per 10 s', async () => {
        answer = (res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', overallStatus: 'healthy', checks: {} }));
        };
        const check = create(url());

        await Promise.all(Array.from({ length: 20 }, () => check.check()));
        await check.check();

        expect(requests).toBe(1);
    });

    it('is down, not critical, and names no host when the Sync API does not answer in time', async () => {
        answer = () => undefined;

        const check = await create(url()).check();

        expect(check).toEqual(
            expect.objectContaining({
                status: 'down',
                critical: false,
                reachable: false,
                message: 'No response within 3000 ms',
            }),
        );
        expect(JSON.stringify(check)).not.toContain('127.0.0.1');
    }, 10000);

    it('is down when nothing listens', async () => {
        const check = await create('http://127.0.0.1:1/health').check();

        expect(check).toEqual(
            expect.objectContaining({
                status: 'down',
                reachable: false,
                message: 'Sync API not reachable (ECONNREFUSED)',
            }),
        );
    });
});

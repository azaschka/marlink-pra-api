import { INestApplication } from '@nestjs/common';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import request from 'supertest';
import { ApiKeyAuthGuard } from '../../auth/guards';
import { BaseEvent } from '../../core/events';
import { MonitoringRequestPipe } from '../../monitoring/pipes';
import { LogBusSubscriberService } from '../services/log-bus-subscriber.service';
import { LogFilterService } from '../services/log-filter.service';
import { LogService } from '../services/log.service';
import { LogController } from './log.controller';

class TestEvent extends BaseEvent {
    constructor() {
        super('test-event', {}, 'test-transaction');
    }
}

/**
 * Regression test for the request-scoped LogController: MonitoringRequestPipe injects REQUEST, which makes
 * the controller request-scoped. With the bus subscriptions in its constructor, every request to /logs added
 * a permanent subscription (25 requests meant 25 log entries per event) and nothing was logged before the
 * first request. Uses the real controller, pipe, CQRS buses and HTTP stack.
 */
describe('LogController request scope', () => {
    let app: INestApplication;
    const logService = {
        logCommand: jest.fn(),
        logEvent: jest.fn(),
        retrieveLogs: jest.fn().mockResolvedValue([]),
        countLogs: jest.fn().mockResolvedValue(0),
        clearLogs: jest.fn().mockResolvedValue(undefined),
        purgeAllLogs: jest.fn().mockResolvedValue(undefined),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CqrsModule.forRoot()],
            controllers: [LogController],
            providers: [
                { provide: LogService, useValue: logService },
                LogFilterService,
                LogBusSubscriberService,
                MonitoringRequestPipe,
            ],
        })
            .overrideGuard(ApiKeyAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        app = moduleRef.createNestApplication({ logger: false });
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        logService.logEvent.mockClear();
    });

    it('logs an event published before any request to /logs', () => {
        app.get(EventBus).publish(new TestEvent());

        expect(logService.logEvent).toHaveBeenCalledTimes(1);
    });

    it('logs an event exactly once after many requests to /logs', async () => {
        for (let i = 0; i < 25; i++) {
            await request(app.getHttpServer() as Server)
                .get('/logs')
                .query({ pageSize: 10, pageNumber: 1 })
                .expect(200);
        }
        await request(app.getHttpServer() as Server)
            .delete('/logs')
            .expect(204);

        app.get(EventBus).publish(new TestEvent());

        expect(logService.logEvent).toHaveBeenCalledTimes(1);
    });
});

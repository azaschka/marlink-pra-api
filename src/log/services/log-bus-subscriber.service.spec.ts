import { Logger } from '@nestjs/common';
import { CommandBus, EventBus, ICommand, IEvent } from '@nestjs/cqrs';
import { Subject } from 'rxjs';
import { AddMonitoringRecordCommand } from '../../monitoring/commands';
import { LogBusSubscriberService } from './log-bus-subscriber.service';
import { LogFilterService } from './log-filter.service';
import { LogService } from './log.service';

describe('LogBusSubscriberService', () => {
    let commands$: Subject<ICommand>;
    let events$: Subject<IEvent>;
    let logService: { logCommand: jest.Mock; logEvent: jest.Mock };
    let service: LogBusSubscriberService;

    beforeEach(() => {
        commands$ = new Subject<ICommand>();
        events$ = new Subject<IEvent>();
        logService = {
            logCommand: jest.fn(),
            logEvent: jest.fn(),
        };
        service = new LogBusSubscriberService(
            commands$ as unknown as CommandBus,
            events$ as unknown as EventBus,
            logService as unknown as LogService,
            new LogFilterService(),
        );
    });

    it('logs every command and event exactly once after module init', () => {
        service.onModuleInit();

        commands$.next({ commandType: 'test-command' } as ICommand);
        events$.next({ eventType: 'test-event' } as IEvent);

        expect(logService.logCommand).toHaveBeenCalledTimes(1);
        expect(logService.logEvent).toHaveBeenCalledTimes(1);
    });

    it('does not log monitoring record commands', () => {
        service.onModuleInit();

        commands$.next(new AddMonitoringRecordCommand('tx', '/sites'));

        expect(logService.logCommand).not.toHaveBeenCalled();
    });

    it('stops logging after module destroy', () => {
        service.onModuleInit();
        service.onModuleDestroy();

        commands$.next({ commandType: 'test-command' } as ICommand);
        events$.next({ eventType: 'test-event' } as IEvent);

        expect(logService.logCommand).not.toHaveBeenCalled();
        expect(logService.logEvent).not.toHaveBeenCalled();
    });

    it('keeps the subscription alive when queuing a log entry fails', () => {
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        logService.logCommand.mockImplementationOnce(() => {
            throw new TypeError('Converting circular structure to JSON');
        });
        service.onModuleInit();

        commands$.next({ commandType: 'first' } as ICommand);
        commands$.next({ commandType: 'second' } as ICommand);

        expect(logService.logCommand).toHaveBeenCalledTimes(2);
    });
});

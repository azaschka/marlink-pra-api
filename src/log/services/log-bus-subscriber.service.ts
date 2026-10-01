import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CommandBus, EventBus, ICommand, IEvent } from '@nestjs/cqrs';
import { Subscription } from 'rxjs';
import { LogFilterService } from './log-filter.service';
import { LogService } from './log.service';

/**
 * Persists every command and event dispatched in this process to the system log.
 *
 * Singleton on purpose: the subscription used to live in the constructor of LogController, which
 * MonitoringRequestPipe makes request-scoped, so every request to /logs added another permanent
 * subscription (and nothing was logged before the first request).
 */
@Injectable()
export class LogBusSubscriberService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(LogBusSubscriberService.name);
    private readonly subscriptions = new Subscription();

    constructor(
        private readonly commandBus: CommandBus,
        private readonly eventBus: EventBus,
        private readonly logService: LogService,
        private readonly logFilterService: LogFilterService,
    ) {}

    public onModuleInit(): void {
        this.subscriptions.add(this.commandBus.subscribe((command: ICommand) => this.onCommand(command)));
        this.subscriptions.add(this.eventBus.subscribe((event: IEvent) => this.onEvent(event)));
    }

    public onModuleDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    // Logging must never break command or event dispatch, e.g. on a payload that cannot be serialised.
    private onCommand(command: ICommand): void {
        if (this.logFilterService.isExcludedFromLog(command)) {
            return;
        }

        try {
            this.logService.logCommand(command);
        } catch (error) {
            this.reportFailure('command', error);
        }
    }

    private onEvent(event: IEvent): void {
        try {
            this.logService.logEvent(event);
        } catch (error) {
            this.reportFailure('event', error);
        }
    }

    private reportFailure(kind: string, error: unknown): void {
        this.logger.warn(
            `Failed to queue ${kind} for the system log: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

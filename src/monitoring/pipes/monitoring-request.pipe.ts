import { ArgumentMetadata, Inject, Injectable, PipeTransform } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { CommandBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { TRANSACTION_ID_HEADER } from '../../core/decorators';
import { UuidUtility } from '../../shared/utilities';
import { AddMonitoringRecordCommand } from '../commands';

@Injectable()
export class MonitoringRequestPipe implements PipeTransform {
    // The pipe runs once per decorated handler argument; a request is recorded only once.
    private static readonly RECORDED_REQUESTS = new WeakSet<Request>();

    constructor(
        @Inject(REQUEST) private readonly request: Request,
        private readonly commandBus: CommandBus,
    ) {}

    public async transform(value: unknown, metadata: ArgumentMetadata) {
        // Skip if this isn't an HTTP request body, query, param.
        if (metadata.type !== 'query' && metadata.type !== 'body' && metadata.type !== 'param') {
            return value;
        }

        if (MonitoringRequestPipe.RECORDED_REQUESTS.has(this.request)) {
            return value;
        }

        MonitoringRequestPipe.RECORDED_REQUESTS.add(this.request);

        if (!this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()]) {
            this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()] = UuidUtility.generate();
        }

        const transactionId = this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string;

        try {
            await this.commandBus.execute<AddMonitoringRecordCommand, void>(
                new AddMonitoringRecordCommand(transactionId, this.request.path),
            );
        } catch (error) {
            console.error(
                `[${transactionId}] MonitoringRequestPipe: Failed to add monitoring record for endpoint ${this.request.path}.`,
                error,
            );
        }

        return value;
    }
}

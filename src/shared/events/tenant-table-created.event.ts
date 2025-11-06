import { BaseEvent } from '../../core/events';

export interface TenantTableCreatedEventPayload {
    tenantId: number;
    tableName: string;
}

export class TenantTableCreatedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'tenant-table-created';

    constructor(transactionId: string, payload: TenantTableCreatedEventPayload) {
        super(TenantTableCreatedEvent.EVENT_TYPE, payload, transactionId);
    }
}

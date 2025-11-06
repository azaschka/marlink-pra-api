import { BaseEvent } from '../../core/events';

export interface TenantTableCreationFailedEventPayload {
    tenantId: number;
    errorMessage: string;
}

export class TenantTableCreationFailedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'tenant-table-creation-failed';

    constructor(transactionId: string, payload: TenantTableCreationFailedEventPayload) {
        super(TenantTableCreationFailedEvent.EVENT_TYPE, payload, transactionId);
    }
}

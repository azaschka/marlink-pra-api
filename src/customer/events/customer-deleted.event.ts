import { BaseEvent } from '../../core/events';

export interface CustomerDeletedEventPayload {
    id: number;
}

export class CustomerDeletedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'customer-deleted';

    constructor(transactionId: string, payload: CustomerDeletedEventPayload) {
        super(CustomerDeletedEvent.EVENT_TYPE, payload, transactionId);
    }
}

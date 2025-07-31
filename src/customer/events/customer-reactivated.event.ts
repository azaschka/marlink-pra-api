import { BaseEvent } from '../../core/events';

export interface CustomerReactivatedEventPayload {
    id: number;
}

export class CustomerReactivatedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'customer-reactivated';

    constructor(transactionId: string, payload: CustomerReactivatedEventPayload) {
        super(CustomerReactivatedEvent.EVENT_TYPE, payload, transactionId);
    }
}

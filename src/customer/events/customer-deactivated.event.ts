import { BaseEvent } from '../../core/events';

export interface CustomerDeactivatedEventPayload {
    id: number;
}

export class CustomerDeactivatedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'customer-deactivated';

    constructor(transactionId: string, payload: CustomerDeactivatedEventPayload) {
        super(CustomerDeactivatedEvent.EVENT_TYPE, payload, transactionId);
    }
}

import { BaseEvent } from '../../core/events';
import { Customer } from '../models';

export interface CustomerCreatedEventPayload {
    customer: Customer;
}

export class CustomerCreatedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'customer-created';

    constructor(transactionId: string, payload: CustomerCreatedEventPayload) {
        super(CustomerCreatedEvent.EVENT_TYPE, payload, transactionId);
    }
}

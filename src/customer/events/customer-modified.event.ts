import { BaseEvent } from '../../core/events';
import { Customer } from '../models';

export interface CustomerModifiedEventPayload {
    customer: Customer;
}

export class CustomerModifiedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'customer-modified';

    constructor(transactionId: string, payload: CustomerModifiedEventPayload) {
        super(CustomerModifiedEvent.EVENT_TYPE, payload, transactionId);
    }
}

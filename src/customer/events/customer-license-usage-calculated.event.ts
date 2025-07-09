import { BaseEvent } from '../../core/events';
import { CustomerLicenseUsage } from '../models';

export interface CustomerLicenseUsageCalculatedEventPayload {
    customerLicenseUsage: CustomerLicenseUsage;
}

export class CustomerLicenseUsageCalculatedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'customer-license-usage-calculated';

    constructor(transactionId: string, payload: CustomerLicenseUsageCalculatedEventPayload) {
        super(CustomerLicenseUsageCalculatedEvent.EVENT_TYPE, payload, transactionId);
    }
}

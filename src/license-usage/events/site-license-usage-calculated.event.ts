import { BaseEvent } from '../../core/events';
import { SiteLicenseUsage } from '../models';

export interface SiteLicenseUsageCalculatedEventPayload {
    siteLicenseUsage: SiteLicenseUsage;
}

export class SiteLicenseUsageCalculatedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'site-license-usage-calculated';

    constructor(transactionId: string, payload: SiteLicenseUsageCalculatedEventPayload) {
        super(SiteLicenseUsageCalculatedEvent.EVENT_TYPE, payload, transactionId);
    }
}

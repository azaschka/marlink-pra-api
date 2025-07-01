import { BaseEvent } from '../../core/events';
import { Site } from '../models';

export interface SiteCreatedEventPayload {
    site: Site;
}

export class SiteCreatedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'site-created';

    constructor(transactionId: string, payload: SiteCreatedEventPayload) {
        super(SiteCreatedEvent.EVENT_TYPE, payload, transactionId);
    }
}

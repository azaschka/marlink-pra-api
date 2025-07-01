import { BaseEvent } from '../../core/events';
import { Site } from '../models';

export interface SiteModifiedEventPayload {
    site: Site;
}

export class SiteModifiedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'site-modified';

    constructor(transactionId: string, payload: SiteModifiedEventPayload) {
        super(SiteModifiedEvent.EVENT_TYPE, payload, transactionId);
    }
}

import { BaseEvent } from '../../core/events';

export interface SiteDeletedEventPayload {
    id: number;
}

export class SiteDeletedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'site-deleted';

    constructor(transactionId: string, payload: SiteDeletedEventPayload) {
        super(SiteDeletedEvent.EVENT_TYPE, payload, transactionId);
    }
}

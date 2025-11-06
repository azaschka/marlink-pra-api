import { BaseEvent } from '../../core/events';

export interface AccessDeletedEventPayload {
    id: number;
}

export class AccessDeletedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'access-deleted';

    constructor(transactionId: string, payload: AccessDeletedEventPayload) {
        super(AccessDeletedEvent.EVENT_TYPE, payload, transactionId);
    }
}

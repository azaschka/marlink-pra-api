import { BaseEvent } from '../../core/events';
import { Access } from '../models';

export interface AccessModifiedEventPayload {
    access: Access;
}

export class AccessModifiedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'access-modified';

    constructor(transactionId: string, payload: AccessModifiedEventPayload) {
        super(AccessModifiedEvent.EVENT_TYPE, payload, transactionId);
    }
}

import { BaseEvent } from '../../core/events';
import { Access } from '../models';

export interface AccessCreatedEventPayload {
    access: Access;
}

export class AccessCreatedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'access-created';

    constructor(transactionId: string, payload: AccessCreatedEventPayload) {
        super(AccessCreatedEvent.EVENT_TYPE, payload, transactionId);
    }
}

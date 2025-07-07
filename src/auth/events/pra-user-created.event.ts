import { BaseEvent } from '../../core/events';
import { PraUser } from '../models';

export interface PraUserCreatedEventPayload {
    praUser: PraUser;
}

export class PraUserCreatedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'pra-user-created';

    constructor(transactionId: string, payload: PraUserCreatedEventPayload) {
        super(PraUserCreatedEvent.EVENT_TYPE, payload, transactionId);
    }
}

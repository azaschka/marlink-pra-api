import { BaseEvent } from '../../core/events';
import { PraUser } from '../models';

export interface PraUserUpdatedEventPayload {
    praUser: PraUser;
}

export class PraUserUpdatedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'pra-user-updated';

    constructor(transactionId: string, payload: PraUserUpdatedEventPayload) {
        super(PraUserUpdatedEvent.EVENT_TYPE, payload, transactionId);
    }
}

import { BaseEvent } from '../../core/events';
import { PraUserEntity } from '../repositories/entities';

export interface PraUserCreatedEventPayload {
    praUser: PraUserEntity;
}

export class PraUserCreatedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'pra-user-created';

    constructor(transactionId: string, payload: PraUserCreatedEventPayload) {
        super(PraUserCreatedEvent.EVENT_TYPE, payload, transactionId);
    }
}

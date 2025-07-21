import { BaseEvent } from '../../core/events';
import { PraUserEntity } from '../repositories/entities';

export interface PraUserModifiedEventPayload {
    praUser: PraUserEntity;
}

export class PraUserModifiedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'pra-user-modified';

    constructor(transactionId: string, payload: PraUserModifiedEventPayload) {
        super(PraUserModifiedEvent.EVENT_TYPE, payload, transactionId);
    }
}

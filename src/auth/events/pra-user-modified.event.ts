import { BaseEvent } from '../../core/events';
import { PraUser } from '../models';

export interface PraUserModifiedEventPayload {
    praUser: PraUser;
}

export class PraUserModifiedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'pra-user-modified';

    constructor(transactionId: string, payload: PraUserModifiedEventPayload) {
        super(PraUserModifiedEvent.EVENT_TYPE, payload, transactionId);
    }
}

import { BaseEvent } from '../../core/events';

export interface PraUserDeletedEventPayload {
    id: number;
}

export class PraUserDeletedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'pra-user-deleted';

    constructor(transactionId: string, payload: PraUserDeletedEventPayload) {
        super(PraUserDeletedEvent.EVENT_TYPE, payload, transactionId);
    }
}

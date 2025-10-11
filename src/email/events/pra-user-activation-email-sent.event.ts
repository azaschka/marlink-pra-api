import { BaseEvent } from '../../core/events';

export interface PraUserActivationEmailSentEventPayload {
    email: string;
}

export class PraUserActivationEmailSentEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'pra-user-activation-email-sent';

    constructor(transactionId: string, payload: PraUserActivationEmailSentEventPayload) {
        super(PraUserActivationEmailSentEvent.EVENT_TYPE, payload, transactionId);
    }
}

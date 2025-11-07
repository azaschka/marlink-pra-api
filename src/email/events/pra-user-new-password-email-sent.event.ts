import { BaseEvent } from '../../core/events';

export interface PraUserNewPasswordEmailSentEventPayload {
    email: string;
}

export class PraUserNewPasswordEmailSentEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'pra-user-new-password-email-sent';

    constructor(transactionId: string, payload: PraUserNewPasswordEmailSentEventPayload) {
        super(PraUserNewPasswordEmailSentEvent.EVENT_TYPE, payload, transactionId);
    }
}

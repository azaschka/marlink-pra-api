import { BaseEvent } from '../../core/events';

export interface SendPraUserNewPasswordEmailFailedEventPayload {
    email: string;
    errorMessage: string;
}

export class SendPraUserNewPasswordEmailFailedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'send-pra-user-new-password-email-failed';

    constructor(transactionId: string, payload: SendPraUserNewPasswordEmailFailedEventPayload) {
        super(SendPraUserNewPasswordEmailFailedEvent.EVENT_TYPE, payload, transactionId);
    }
}

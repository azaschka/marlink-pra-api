import { BaseEvent } from '../../core/events';

export interface SendUserNewPasswordEmailFailedEventPayload {
    email: string;
    errorMessage: string;
}

export class SendUserNewPasswordEmailFailedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'send-user-new-password-email-failed';

    constructor(transactionId: string, payload: SendUserNewPasswordEmailFailedEventPayload) {
        super(SendUserNewPasswordEmailFailedEvent.EVENT_TYPE, payload, transactionId);
    }
}

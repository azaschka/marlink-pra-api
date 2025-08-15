import { BaseEvent } from '../../core/events';

export interface SendUserForgotPasswordEmailFailedEventPayload {
    email: string;
    errorMessage: string;
}

export class SendUserForgotPasswordEmailFailedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'send-user-forgot-password-email-failed';

    constructor(transactionId: string, payload: SendUserForgotPasswordEmailFailedEventPayload) {
        super(SendUserForgotPasswordEmailFailedEvent.EVENT_TYPE, payload, transactionId);
    }
}

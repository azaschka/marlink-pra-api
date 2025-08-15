import { BaseEvent } from '../../core/events';

export interface UserForgotPasswordEmailSentEventPayload {
    email: string;
}

export class UserForgotPasswordEmailSentEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'user-forgot-password-email-sent';

    constructor(transactionId: string, payload: UserForgotPasswordEmailSentEventPayload) {
        super(UserForgotPasswordEmailSentEvent.EVENT_TYPE, payload, transactionId);
    }
}

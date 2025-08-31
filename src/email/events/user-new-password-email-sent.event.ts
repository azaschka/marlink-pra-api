import { BaseEvent } from '../../core/events';

export interface UserNewPasswordEmailSentEventPayload {
    email: string;
}

export class UserNewPasswordEmailSentEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'user-new-password-email-sent';

    constructor(transactionId: string, payload: UserNewPasswordEmailSentEventPayload) {
        super(UserNewPasswordEmailSentEvent.EVENT_TYPE, payload, transactionId);
    }
}

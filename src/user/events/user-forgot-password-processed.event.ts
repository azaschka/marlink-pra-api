import { BaseEvent } from '../../core/events';

export interface UserForgotPasswordProcessedEventPayload {
    email: string;
    username: string;
    password: string;
}

export class UserForgotPasswordProcessedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'user-forgot-password-processed';

    constructor(transactionId: string, payload: UserForgotPasswordProcessedEventPayload) {
        super(UserForgotPasswordProcessedEvent.EVENT_TYPE, payload, transactionId);
    }
}

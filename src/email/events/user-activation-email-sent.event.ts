import { BaseEvent } from '../../core/events';

export interface UserActivationEmailSentEventPayload {
    email: string;
}

export class UserActivationEmailSentEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'user-activation-email-sent';

    constructor(transactionId: string, payload: UserActivationEmailSentEventPayload) {
        super(UserActivationEmailSentEvent.EVENT_TYPE, payload, transactionId);
    }
}

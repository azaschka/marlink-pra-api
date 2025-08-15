import { BaseEvent } from '../../core/events';

export interface SendUserActivationEmailFailedEventPayload {
    email: string;
    errorMessage: string;
}

export class SendUserActivationEmailFailedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'send-user-activation-email-failed';

    constructor(transactionId: string, payload: SendUserActivationEmailFailedEventPayload) {
        super(SendUserActivationEmailFailedEvent.EVENT_TYPE, payload, transactionId);
    }
}

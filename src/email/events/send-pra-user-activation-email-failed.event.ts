import { BaseEvent } from '../../core/events';

export interface SendPraUserActivationEmailFailedEventPayload {
    email: string;
    errorMessage: string;
}

export class SendPraUserActivationEmailFailedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'send-pra-user-activation-email-failed';

    constructor(transactionId: string, payload: SendPraUserActivationEmailFailedEventPayload) {
        super(SendPraUserActivationEmailFailedEvent.EVENT_TYPE, payload, transactionId);
    }
}

import { BaseEvent } from '../../core/events';

export interface DisableUsersLoginAfterCustomerDeactivationFailedEventPayload {
    customerId: number;
    errorMessage: string;
}

export class DisableUsersLoginAfterCustomerDeactivationFailedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'disable-users-login-after-customer-deactivation-failed';

    constructor(transactionId: string, payload: DisableUsersLoginAfterCustomerDeactivationFailedEventPayload) {
        super(DisableUsersLoginAfterCustomerDeactivationFailedEvent.EVENT_TYPE, payload, transactionId);
    }
}

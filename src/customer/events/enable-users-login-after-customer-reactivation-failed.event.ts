import { BaseEvent } from '../../core/events';

export interface EnableUsersLoginAfterCustomerReactivationFailedEventPayload {
    customerId: number;
    errorMessage: string;
}

export class EnableUsersLoginAfterCustomerReactivationFailedEvent extends BaseEvent {
    public static readonly EVENT_TYPE = 'enable-users-login-after-customer-reactivation-failed';

    constructor(transactionId: string, payload: EnableUsersLoginAfterCustomerReactivationFailedEventPayload) {
        super(EnableUsersLoginAfterCustomerReactivationFailedEvent.EVENT_TYPE, payload, transactionId);
    }
}

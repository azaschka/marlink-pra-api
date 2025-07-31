import { Injectable } from '@nestjs/common';
import { ICommand, Saga, ofType } from '@nestjs/cqrs';
import { Observable, map } from 'rxjs';
import {
    DisableUsersLoginAfterCustomerDeactivationCommand,
    EnableUsersLoginAfterCustomerReactivationCommand,
} from '../commands';
import {
    CustomerDeactivatedEvent,
    CustomerDeactivatedEventPayload,
    CustomerReactivatedEvent,
    CustomerReactivatedEventPayload,
} from '../events';

@Injectable()
export class CustomerSaga {
    @Saga()
    public onCustomerDeactivatedEvent = (events$: Observable<CustomerDeactivatedEvent>): Observable<ICommand> => {
        return events$.pipe(
            ofType(CustomerDeactivatedEvent),
            map(
                (event) =>
                    new DisableUsersLoginAfterCustomerDeactivationCommand(
                        event.transactionId,
                        (event.payload as CustomerDeactivatedEventPayload).id,
                    ),
            ),
        );
    };

    @Saga()
    public onCustomerReactivatedEvent = (events$: Observable<CustomerReactivatedEvent>): Observable<ICommand> => {
        return events$.pipe(
            ofType(CustomerReactivatedEvent),
            map(
                (event) =>
                    new EnableUsersLoginAfterCustomerReactivationCommand(
                        event.transactionId,
                        (event.payload as CustomerReactivatedEventPayload).id,
                    ),
            ),
        );
    };
}

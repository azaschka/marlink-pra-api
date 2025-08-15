import { Injectable } from '@nestjs/common';
import { ICommand, Saga, ofType } from '@nestjs/cqrs';
import { Observable, map } from 'rxjs';
import { SendUserForgotPasswordEmailCommand } from '../../email/commands';
import { UserForgotPasswordProcessedEvent, UserForgotPasswordProcessedEventPayload } from '../events';

@Injectable()
export class UserSaga {
    @Saga()
    public onUserForgotPasswordProcessedEvent = (
        events$: Observable<UserForgotPasswordProcessedEvent>,
    ): Observable<ICommand> => {
        return events$.pipe(
            ofType(UserForgotPasswordProcessedEvent),
            map(
                (event) =>
                    new SendUserForgotPasswordEmailCommand(
                        event.transactionId,
                        (event.payload as UserForgotPasswordProcessedEventPayload).email,
                        (event.payload as UserForgotPasswordProcessedEventPayload).username,
                        (event.payload as UserForgotPasswordProcessedEventPayload).password,
                    ),
            ),
        );
    };
}

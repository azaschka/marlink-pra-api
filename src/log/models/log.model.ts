import { LogActionType } from '../enums/log-action-type.enum';

export interface Log {
    id: number;
    serviceName: string;
    actionType: LogActionType;
    actionName: string;
    transactionId: string;
    triggeredBy?: string;
    creationDate: Date;
    payload: string;
}

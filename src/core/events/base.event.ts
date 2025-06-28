import { UuidUtility } from '../../shared/utilities';

export class BaseEvent {
    public readonly id!: string;
    public readonly eventTime!: string;

    constructor(
        public readonly eventType: string,
        public readonly payload: unknown,
        public readonly transactionId: string,
    ) {
        this.id = UuidUtility.generate();
        this.eventTime = new Date().toISOString();
    }
}

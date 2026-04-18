import { JumpointNodeServiceType } from '../enums';

export class CreateJumpointNodeServiceCommand {
    public readonly commandType = 'create-jumpoint-node-service';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly serviceType: JumpointNodeServiceType,
    ) {}
}

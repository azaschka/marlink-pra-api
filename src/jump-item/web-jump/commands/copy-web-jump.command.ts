import { JumpGroupType } from '../enums';

export class CopyWebJumpCommand {
    public readonly commandType = 'copy-web-jump';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly jumpGroupId: number,
        public readonly jumpGroupType: JumpGroupType,
        public readonly name: string,
    ) {}
}

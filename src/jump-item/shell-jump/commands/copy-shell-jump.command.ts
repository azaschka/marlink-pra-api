import { JumpGroupType } from '../enums';

export class CopyShellJumpCommand {
    public readonly commandType = 'copy-shell-jump';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly jumpGroupId: number,
        public readonly jumpGroupType: JumpGroupType,
        public readonly name: string,
    ) {}
}

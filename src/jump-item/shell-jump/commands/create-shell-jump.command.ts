import { JumpGroupType, ShellJumpProtocolType, ShellJumpTerminalType } from '../enums';

export class CreateShellJumpCommand {
    public readonly commandType = 'create-shell-jump';

    constructor(
        public readonly transactionId: string,
        public readonly name: string,
        public readonly jumpointId: number,
        public readonly hostname: string,
        public readonly protocolType: ShellJumpProtocolType,
        public readonly port: number | undefined,
        public readonly jumpGroupId: number,
        public readonly jumpGroupType?: JumpGroupType,
        public readonly terminalType?: ShellJumpTerminalType,
        public readonly keepAliveIdleSessionInSeconds?: number,
        public readonly tag?: string,
        public readonly comments?: string,
        public readonly jumpPolicyId?: number | null,
        public readonly username?: string,
        public readonly sessionPolicyId?: number | null,
    ) {}
}

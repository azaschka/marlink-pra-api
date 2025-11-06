export class ModifyJumpGroupCommand {
    public readonly commandType = 'modify-jump-group';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly name?: string,
        public readonly codeName?: string,
        public readonly comments?: string | null,
    ) {}
}

export class CreateJumpGroupCommand {
    public readonly commandType = 'create-jump-group';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly name: string,
        public readonly codeName?: string,
        public readonly comments?: string | null,
    ) {}
}

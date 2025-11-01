export class RetrieveShellJumpByIdQuery {
    public readonly queryType = 'retrieve-shell-jump-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}

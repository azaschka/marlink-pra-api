export class SyncUsersCommand {
    public readonly commandType = 'sync-users';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
    ) {}
}

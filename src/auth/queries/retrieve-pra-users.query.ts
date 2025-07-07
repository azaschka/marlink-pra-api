export class RetrievePraUsersQuery {
    public readonly queryType = 'retrieve-pra-users';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly id?: number,
        public readonly username?: string,
    ) {}
}

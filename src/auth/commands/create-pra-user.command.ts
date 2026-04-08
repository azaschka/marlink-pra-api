import { BusinessUnit } from '../../beyondtrust-instance/enums';
import { UserRole } from '../enums';

export class CreatePraUserCommand {
    public readonly commandType = 'create-pra-user';

    constructor(
        public readonly transactionId: string,
        public readonly username: string,
        public readonly password: string | undefined,
        public readonly email: string,
        public readonly role: UserRole,
        public readonly displayName: string,
        public readonly businessUnit?: BusinessUnit,
        public readonly canManagePraUsers?: boolean,
    ) {}
}

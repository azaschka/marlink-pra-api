import { BusinessUnit } from '../../beyondtrust-instance/enums';
import { UserRole } from '../enums';

export class ModifyPraUserCommand {
    public readonly commandType = 'modify-pra-user';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly username?: string,
        public readonly password?: string,
        public readonly email?: string,
        public readonly role?: UserRole,
        public readonly displayName?: string,
        public readonly businessUnit?: BusinessUnit,
        public readonly canManagePraUsers?: boolean,
        public readonly regeneratePassword?: boolean,
    ) {}
}

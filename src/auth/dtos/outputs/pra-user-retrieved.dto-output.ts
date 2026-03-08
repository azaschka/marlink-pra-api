import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { UserRole } from '../../enums';

export class PraUserRetrievedDtoOutput {
    public id!: number;
    public username!: string;
    public email!: string;
    public role!: UserRole;
    public displayName!: string;
    public businessUnit?: BusinessUnit;
    public creationDate!: Date;
    public lastModificationDate?: Date;
}

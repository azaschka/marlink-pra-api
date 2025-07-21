import { BusinessUnit, UserRole } from '../../enums';

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

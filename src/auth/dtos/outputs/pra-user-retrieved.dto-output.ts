export class PraUserRetrievedDtoOutput {
    public id!: number;
    public username!: string;
    public email!: string;
    public role!: string;
    public displayName!: string;
    public creationDate!: Date;
    public lastModificationDate?: Date;
}

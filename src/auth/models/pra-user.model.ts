export interface PraUser {
    id: number;
    username: string;
    password?: string;
    email: string;
    role: string;
    displayName: string;
    creationDate: Date;
    lastModificationDate?: Date;
}

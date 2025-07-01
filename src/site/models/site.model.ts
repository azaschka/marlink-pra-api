export interface Site {
    id: number;
    key: string;
    name: string;
    customerKey: string;
    customerName: string;
    approverUsername: string;
    approverEmail: string;
    creationDate: Date;
    lastModificationDate?: Date;
}

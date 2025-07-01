export interface BaseCommand {
    transactionId: string;
    commandType: string;
    initiatedBy?: string;
}

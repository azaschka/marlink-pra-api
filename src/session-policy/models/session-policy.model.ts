export interface SessionPolicy {
    id: number;
    displayName: string;
    codeName: string;
    description: string | null;
    lastSyncDate: Date;
}

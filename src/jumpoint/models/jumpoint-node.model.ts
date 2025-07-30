export interface JumpointNode {
    id: number;
    jumpointId: number;
    lastConnectDate?: Date | null;
    lastDisconnectDate?: Date | null;
    publicIp: string;
    privateIp: string;
    hostname: string;
    lastSyncDate: Date;
}

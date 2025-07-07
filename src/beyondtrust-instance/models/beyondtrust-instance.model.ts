export interface BeyondtrustInstance {
    id: number;
    name: string;
    authClientId: string;
    authClientSecret: string;
    oauth2TokenUrl: string;
    apiBaseUrl: string;
    creationDate: Date;
    lastModificationDate?: Date;
}

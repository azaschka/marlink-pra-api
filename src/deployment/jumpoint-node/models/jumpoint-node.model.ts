import { JumpointNodeBusinessUnit, JumpointNodeHypervisorType, JumpointNodeServiceType } from '../enums';

export interface JumpointNode {
    id: number;
    certname: string;
    businessUnit: JumpointNodeBusinessUnit;
    siteKey: string;
    status: string;
    puppetServerDomain: string;
    hypervisorId?: string;
    hypervisorType?: JumpointNodeHypervisorType;
    customerName?: string | null;
    vmId?: number;
    serviceType?: JumpointNodeServiceType;
    hasApproval?: boolean;
    isoFilePath?: string;
    creationDate: Date;
    lastModificationDate?: Date;
}

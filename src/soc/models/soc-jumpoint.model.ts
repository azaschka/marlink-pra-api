import { Jumpoint } from '../../jumpoint/models';

export interface SocJumpoint {
    jumpoint: Jumpoint;
    customerKey?: string;
    customerName?: string;
    siteKey?: string;
    siteName?: string;
}

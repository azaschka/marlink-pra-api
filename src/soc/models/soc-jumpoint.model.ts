import { Jumpoint } from '../../jumpoint/models';
import { SocCustomerSiteMapping } from './soc-customer-site-mapping.model';

export interface SocJumpoint extends SocCustomerSiteMapping {
    jumpoint: Jumpoint;
}

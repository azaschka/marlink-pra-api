import { Customer } from '../../customer/models';
import { Site } from '../../site/models';

export abstract class SocJumpPolicyUtility {
    public static generateNamePattern(customer: Customer | undefined, site: Site | undefined): string {
        let namePattern = '';

        if (customer && site) {
            namePattern = `${customer.name.toUpperCase()}_${site.name.toUpperCase()}_${site.key.toUpperCase()}%`;
        } else if (customer) {
            namePattern = `${customer.name.toUpperCase()}_%`;
        } else if (site) {
            namePattern = `%_${site.name.toUpperCase()}_${site.key.toUpperCase()}%`;
        }

        return namePattern;
    }
}

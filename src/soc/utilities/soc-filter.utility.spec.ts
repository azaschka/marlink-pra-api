import { SocCustomerSiteMappingStatus } from '../enums';
import { SocCustomerSiteMapping } from '../models';
import { SocFilterUtility } from './soc-filter.utility';

describe('SocFilterUtility', () => {
    const acmeHamburg: SocCustomerSiteMapping = {
        customerKey: 'acme',
        siteKey: 'HAM001',
        mappingStatus: SocCustomerSiteMappingStatus.CustomerAndSite,
    };
    const acmeOnly: SocCustomerSiteMapping = {
        customerKey: 'acme',
        mappingStatus: SocCustomerSiteMappingStatus.CustomerOnly,
    };
    const globexOnly: SocCustomerSiteMapping = {
        customerKey: 'globex',
        mappingStatus: SocCustomerSiteMappingStatus.CustomerOnly,
    };
    const unmapped: SocCustomerSiteMapping = { mappingStatus: SocCustomerSiteMappingStatus.Unmapped };

    const items = [acmeHamburg, acmeOnly, globexOnly, unmapped];

    it('should return everything, including unmapped objects, for platform-wide access', () => {
        expect(SocFilterUtility.apply(items, {})).toEqual(items);
    });

    it('should hide unmapped objects from a restricted scope', () => {
        const result = SocFilterUtility.apply(items, { scopedCustomerKeys: ['acme', 'globex'] });

        expect(result).toEqual([acmeHamburg, acmeOnly, globexOnly]);
        expect(result).not.toContain(unmapped);
    });

    it('should restrict a scoped caller to its own customers', () => {
        expect(SocFilterUtility.apply(items, { scopedCustomerKeys: ['acme'] })).toEqual([acmeHamburg, acmeOnly]);
    });

    it('should apply the customer filter', () => {
        expect(SocFilterUtility.apply(items, { customerKey: 'globex' })).toEqual([globexOnly]);
    });

    it('should apply the site filter', () => {
        expect(SocFilterUtility.apply(items, { siteKey: 'HAM001' })).toEqual([acmeHamburg]);
    });

    it('should allow listing only the unattributable objects', () => {
        expect(SocFilterUtility.apply(items, { mappingStatus: SocCustomerSiteMappingStatus.Unmapped })).toEqual([
            unmapped,
        ]);
    });

    it('should not let an explicit filter widen the scope', () => {
        expect(SocFilterUtility.apply(items, { customerKey: 'globex', scopedCustomerKeys: ['acme'] })).toEqual([]);
    });
});

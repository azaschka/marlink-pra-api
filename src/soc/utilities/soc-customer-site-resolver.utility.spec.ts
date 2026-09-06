import { Customer } from '../../customer/models';
import { Site } from '../../site/models';
import { SocCustomerSiteMappingStatus } from '../enums';
import { SocCustomerSiteResolver } from './soc-customer-site-resolver.utility';

describe('SocCustomerSiteResolver', () => {
    const acme = { key: 'acme', name: 'ACME' } as Customer;
    const globex = { key: 'globex', name: 'GLOBEX' } as Customer;

    const hamburg = { key: 'HAM001', name: 'HAMBURG', customerKey: 'acme' } as Site;
    const berlin = { key: 'BER001', name: 'BERLIN', customerKey: 'acme' } as Site;
    // Deliberately points at a customer that does not exist, to exercise the SiteOnly branch.
    const orphanedSite = { key: 'OSL001', name: 'OSLO', customerKey: 'vanished' } as Site;

    let resolver: SocCustomerSiteResolver;

    beforeEach(() => {
        resolver = new SocCustomerSiteResolver([acme, globex], [hamburg, berlin, orphanedSite]);
    });

    describe('resolveFromJumpointName', () => {
        it('should resolve customer and site from the trailing site segment', () => {
            expect(resolver.resolveFromJumpointName('JP01_ACME_HAMBURG_HAM001')).toEqual({
                customerKey: 'acme',
                customerName: 'ACME',
                siteKey: 'HAM001',
                siteName: 'HAMBURG',
                mappingStatus: SocCustomerSiteMappingStatus.CustomerAndSite,
            });
        });

        it('should be case insensitive', () => {
            expect(resolver.resolveFromJumpointName('jp01_acme_hamburg_ham001').mappingStatus).toBe(
                SocCustomerSiteMappingStatus.CustomerAndSite,
            );
        });

        it('should fall back to the customer when no site segment matches', () => {
            expect(resolver.resolveFromJumpointName('JP01_GLOBEX_SPARE')).toEqual({
                customerKey: 'globex',
                customerName: 'GLOBEX',
                mappingStatus: SocCustomerSiteMappingStatus.CustomerOnly,
            });
        });

        it('should report SiteOnly when the site exists but its customer record is missing', () => {
            expect(resolver.resolveFromJumpointName('JP01_OSLO_OSL001')).toEqual({
                customerKey: 'vanished',
                customerName: undefined,
                siteKey: 'OSL001',
                siteName: 'OSLO',
                mappingStatus: SocCustomerSiteMappingStatus.SiteOnly,
            });
        });

        it('should report Unmapped for names that follow no convention', () => {
            expect(resolver.resolveFromJumpointName('legacy-jumpoint-01').mappingStatus).toBe(
                SocCustomerSiteMappingStatus.Unmapped,
            );
        });

        it('should not attribute a customer whose name only appears unbounded', () => {
            // "ACMEXX" must not match the customer "ACME".
            expect(resolver.resolveFromJumpointName('JP01_ACMEXX_SPARE').mappingStatus).toBe(
                SocCustomerSiteMappingStatus.Unmapped,
            );
        });
    });

    describe('resolveFromJumpGroupName', () => {
        it('should resolve the customer from the leading segment', () => {
            expect(resolver.resolveFromJumpGroupName('ACME_SERVERS')).toEqual({
                customerKey: 'acme',
                customerName: 'ACME',
                mappingStatus: SocCustomerSiteMappingStatus.CustomerOnly,
            });
        });

        it('should report Unmapped when the group does not start with a known customer', () => {
            expect(resolver.resolveFromJumpGroupName('SHARED_INFRA').mappingStatus).toBe(
                SocCustomerSiteMappingStatus.Unmapped,
            );
        });
    });

    describe('resolveFromJumpPolicyDisplayName', () => {
        it('should resolve customer and site from the leading customer/site segment', () => {
            expect(resolver.resolveFromJumpPolicyDisplayName('ACME_BERLIN_BER001_ELEVATED')).toEqual({
                customerKey: 'acme',
                customerName: 'ACME',
                siteKey: 'BER001',
                siteName: 'BERLIN',
                mappingStatus: SocCustomerSiteMappingStatus.CustomerAndSite,
            });
        });

        it('should fall back to the customer when only the customer prefix matches', () => {
            expect(resolver.resolveFromJumpPolicyDisplayName('GLOBEX_DEFAULT').mappingStatus).toBe(
                SocCustomerSiteMappingStatus.CustomerOnly,
            );
        });

        it('should report Unmapped for policies that follow no convention', () => {
            expect(resolver.resolveFromJumpPolicyDisplayName('Default Policy').mappingStatus).toBe(
                SocCustomerSiteMappingStatus.Unmapped,
            );
        });
    });

    it('should return the identical Unmapped instance so callers can compare by reference', () => {
        expect(resolver.resolveFromJumpGroupName('SHARED_INFRA')).toBe(SocCustomerSiteResolver.unmapped);
    });
});

import { Customer } from '../../customer/models';
import { Site } from '../../site/models';
import { SocCustomerSiteMappingStatus } from '../enums';
import { SocCustomerSiteMapping } from '../models';

const UNMAPPED: SocCustomerSiteMapping = { mappingStatus: SocCustomerSiteMappingStatus.Unmapped };

/**
 * Attributes BeyondTrust objects to Marlink customers/sites by reversing the naming
 * conventions that the platform applies when the objects are provisioned:
 *
 * - Jumpoint name:            `<prefix>_<CUSTOMER>_<SITE>_<SITEKEY>` or `<prefix>_<CUSTOMER>_<suffix>`
 * - Jump policy display name: `<CUSTOMER>_<SITE>_<SITEKEY><suffix>`
 * - Jump group name:          `<CUSTOMER>_<suffix>`
 *
 * Resolving in this direction (object -> customer) rather than the other way round is
 * what allows the SOC endpoints to return objects that follow no convention at all.
 * Those come back as `Unmapped`, which is a deliberate signal rather than an omission.
 *
 * Results are memoised per input string because many jump items share the same jumpoint,
 * jump group or jump policy.
 */
export class SocCustomerSiteResolver {
    private readonly customers: Customer[];
    private readonly sites: Site[];
    private readonly customersByKey: Map<string, Customer>;
    private readonly sitesByUpperKey: Map<string, Site>;
    private readonly cache = new Map<string, SocCustomerSiteMapping>();

    constructor(customers: Customer[], sites: Site[]) {
        this.customers = customers;
        this.sites = sites;
        this.customersByKey = new Map(customers.map((customer) => [customer.key, customer]));
        this.sitesByUpperKey = new Map(sites.map((site) => [site.key.toUpperCase(), site]));
    }

    public static get unmapped(): SocCustomerSiteMapping {
        return UNMAPPED;
    }

    /** Jumpoint names carry the site as a trailing `_<SITE>_<SITEKEY>` segment. */
    public resolveFromJumpointName(jumpointName: string): SocCustomerSiteMapping {
        return this.memoise(`jumpoint:${jumpointName}`, () => {
            const upperName = jumpointName.toUpperCase();
            const site = this.findSiteBySuffix(upperName);

            if (site) {
                return this.fromSite(site);
            }

            const customer = this.findCustomerByInfix(upperName);

            return customer ? this.fromCustomer(customer) : UNMAPPED;
        });
    }

    /** Jump policy display names start with `<CUSTOMER>_<SITE>_<SITEKEY>`. */
    public resolveFromJumpPolicyDisplayName(displayName: string): SocCustomerSiteMapping {
        return this.memoise(`jump-policy:${displayName}`, () => {
            const upperName = displayName.toUpperCase();

            const siteByPrefix = this.sites.find((site) => {
                const customer = this.customersByKey.get(site.customerKey);

                return customer !== undefined && upperName.startsWith(`${this.siteSegment(customer, site)}`);
            });

            if (siteByPrefix) {
                return this.fromSite(siteByPrefix);
            }

            const siteByInfix = this.sites.find((site) => upperName.includes(this.siteSuffix(site)));

            if (siteByInfix) {
                return this.fromSite(siteByInfix);
            }

            const customer = this.findCustomerByPrefix(upperName);

            return customer ? this.fromCustomer(customer) : UNMAPPED;
        });
    }

    /** Jump group names start with `<CUSTOMER>_`. */
    public resolveFromJumpGroupName(jumpGroupName: string): SocCustomerSiteMapping {
        return this.memoise(`jump-group:${jumpGroupName}`, () => {
            const customer = this.findCustomerByPrefix(jumpGroupName.toUpperCase());

            return customer ? this.fromCustomer(customer) : UNMAPPED;
        });
    }

    private memoise(cacheKey: string, resolve: () => SocCustomerSiteMapping): SocCustomerSiteMapping {
        const cached = this.cache.get(cacheKey);

        if (cached) {
            return cached;
        }

        const resolved = resolve();
        this.cache.set(cacheKey, resolved);

        return resolved;
    }

    private findSiteBySuffix(upperName: string): Site | undefined {
        // Fast path: the site key is the trailing underscore-separated token.
        const lastToken = upperName.slice(upperName.lastIndexOf('_') + 1);
        const candidate = this.sitesByUpperKey.get(lastToken);

        if (candidate && upperName.endsWith(this.siteSuffix(candidate))) {
            return candidate;
        }

        // Fallback for site keys that themselves contain underscores.
        return this.sites.find((site) => upperName.endsWith(this.siteSuffix(site)));
    }

    private findCustomerByInfix(upperName: string): Customer | undefined {
        return this.customers.find((customer) => upperName.includes(`_${customer.name.toUpperCase()}_`));
    }

    private findCustomerByPrefix(upperName: string): Customer | undefined {
        return this.customers.find((customer) => upperName.startsWith(`${customer.name.toUpperCase()}_`));
    }

    private siteSuffix(site: Site): string {
        return `_${site.name.toUpperCase()}_${site.key.toUpperCase()}`;
    }

    private siteSegment(customer: Customer, site: Site): string {
        return `${customer.name.toUpperCase()}_${site.name.toUpperCase()}_${site.key.toUpperCase()}`;
    }

    private fromSite(site: Site): SocCustomerSiteMapping {
        const customer = this.customersByKey.get(site.customerKey);

        return {
            customerKey: site.customerKey,
            customerName: customer?.name,
            siteKey: site.key,
            siteName: site.name,
            mappingStatus: customer
                ? SocCustomerSiteMappingStatus.CustomerAndSite
                : SocCustomerSiteMappingStatus.SiteOnly,
        };
    }

    private fromCustomer(customer: Customer): SocCustomerSiteMapping {
        return {
            customerKey: customer.key,
            customerName: customer.name,
            mappingStatus: SocCustomerSiteMappingStatus.CustomerOnly,
        };
    }
}

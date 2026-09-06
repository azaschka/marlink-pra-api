/**
 * Describes how well a BeyondTrust object could be attributed to a Marlink customer/site.
 *
 * Exposed explicitly so consumers never have to infer attribution from empty fields.
 * `Unmapped` is a first-class, actionable finding for the SOC: a remote access path
 * without an identifiable owner.
 */
export enum SocCustomerSiteMappingStatus {
    /** Both the site and its customer record were resolved. */
    CustomerAndSite = 'customer-and-site',

    /** Only the customer could be resolved; the object is not bound to a specific site. */
    CustomerOnly = 'customer-only',

    /** The site was resolved but its customer record is missing — a data integrity issue. */
    SiteOnly = 'site-only',

    /** Neither customer nor site could be resolved. */
    Unmapped = 'unmapped',
}

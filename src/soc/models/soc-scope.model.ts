/**
 * Visibility an access key has on the SOC endpoints.
 *
 * Derived from the business units of the access key: a key covering every business unit
 * is platform-wide and therefore also sees objects that cannot be attributed to any
 * customer. A restricted key only ever sees objects of its own customers, because an
 * unattributable object cannot be proven to belong to it.
 */
export interface SocScope {
    isPlatformWide: boolean;

    /** Only meaningful when `isPlatformWide` is `false`. */
    customerKeys: string[];
}

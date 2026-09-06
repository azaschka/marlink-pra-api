import { Customer } from '../../customer/models';
import { SuperAdminUtility } from '../../shared/utilities';
import { SocScope } from '../models';

export abstract class SocScopeUtility {
    public static resolve(businessUnits: string[], customers: Customer[]): SocScope {
        if (SuperAdminUtility.isSuperAdmin(businessUnits)) {
            return { isPlatformWide: true, customerKeys: [] };
        }

        return { isPlatformWide: false, customerKeys: customers.map((customer) => customer.key) };
    }

    /**
     * Translates a scope into the value the query handlers expect,
     * where `undefined` means "no customer restriction".
     */
    public static toScopedCustomerKeys(scope: SocScope): string[] | undefined {
        return scope.isPlatformWide ? undefined : scope.customerKeys;
    }
}

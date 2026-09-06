import { Customer } from '../../customer/models';
import { SocScopeUtility } from './soc-scope.utility';

describe('SocScopeUtility', () => {
    const customers = [{ key: 'acme' }, { key: 'globex' }] as Customer[];

    // Must stay in sync with SuperAdminUtility's list of known business units.
    const allBusinessUnits = ['MT', 'OA', 'MC', 'EG', 'TE'];

    describe('resolve', () => {
        it('should grant platform-wide visibility to an access key covering every business unit', () => {
            expect(SocScopeUtility.resolve(allBusinessUnits, customers)).toEqual({
                isPlatformWide: true,
                customerKeys: [],
            });
        });

        it('should restrict an access key that covers only some business units', () => {
            expect(SocScopeUtility.resolve(['MT', 'OA'], customers)).toEqual({
                isPlatformWide: false,
                customerKeys: ['acme', 'globex'],
            });
        });
    });

    describe('toScopedCustomerKeys', () => {
        it('should translate platform-wide access into "no restriction"', () => {
            expect(SocScopeUtility.toScopedCustomerKeys({ isPlatformWide: true, customerKeys: [] })).toBeUndefined();
        });

        it('should pass the customer keys through for a restricted scope', () => {
            expect(SocScopeUtility.toScopedCustomerKeys({ isPlatformWide: false, customerKeys: ['acme'] })).toEqual([
                'acme',
            ]);
        });
    });
});

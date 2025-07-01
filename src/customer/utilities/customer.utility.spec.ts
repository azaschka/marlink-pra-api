import { CustomerUtility } from './customer.utility';

describe('CustomerUtility', () => {
    it('should generate admin group policy name correctly', () => {
        const adminGroupPolicyPrefix = 'admin-';
        const customerName = 'Test Customer';
        const expectedResult = 'admin-TEST CUSTOMER';

        const result = CustomerUtility.generateAdminGroupPolicyName(adminGroupPolicyPrefix, customerName);
        expect(result).toBe(expectedResult);
    });
});

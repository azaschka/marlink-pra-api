export abstract class CustomerUtility {
    public static generateAdminGroupPolicyName(adminGroupPolicyPrefix: string, customerName: string): string {
        return `${adminGroupPolicyPrefix}${customerName.trim().toUpperCase()}`;
    }
}

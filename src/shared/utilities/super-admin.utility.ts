export abstract class SuperAdminUtility {
    /**
     * Returns true if the given business units cover ALL known BusinessUnit enum values.
     * An access key with all business units can only belong to a super admin — skip scope validation.
     * Keep this list in sync with BusinessUnit enum in beyondtrust-instance/enums/business-unit.enum.ts.
     * Note: uses string[] to avoid a circular dependency from shared/ → beyondtrust-instance/.
     */
    public static isSuperAdmin(businessUnits: string[]): boolean {
        const allKnownBusinessUnits = ['MT', 'OA', 'MC', 'EG', 'TE'];
        return allKnownBusinessUnits.every((bu) => businessUnits.includes(bu));
    }
}

export abstract class EmailUtility {
    /**
     * Email is the business key of a site user: it is the value the ingestion data provides, and the value
     * BeyondTrust matches externally provisioned users on. A BeyondTrust user id is not stable for a non-local
     * user, because removing and re-creating the account through a new login produces a new id.
     *
     * BeyondTrust treats email addresses case-insensitively, so every comparison has to normalise first.
     */
    public static normalize(email: string): string {
        return email.trim().toLowerCase();
    }

    public static areEqual(email: string | undefined, otherEmail: string | undefined): boolean {
        if (email === undefined || otherEmail === undefined) {
            return false;
        }

        return EmailUtility.normalize(email) === EmailUtility.normalize(otherEmail);
    }

    public static includes(emails: (string | undefined)[], email: string | undefined): boolean {
        return emails.some((candidate) => EmailUtility.areEqual(candidate, email));
    }
}

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

    /**
     * Adds and removes addresses in a list that BeyondTrust stores, comparing case-insensitively. Existing entries
     * keep their spelling, so an unchanged list stays byte-identical and no update is sent for it.
     */
    public static merge(current: string[], toAdd: string[], toRemove: string[]): string[] {
        const result = current.filter((email) => !EmailUtility.includes(toRemove, email));

        for (const email of toAdd) {
            if (!EmailUtility.includes(result, email) && !EmailUtility.includes(toRemove, email)) {
                result.push(email);
            }
        }

        return result;
    }

    /** True when both lists contain the same addresses, ignoring case and order. */
    public static haveSameMembers(emails: string[], otherEmails: string[]): boolean {
        return (
            emails.every((email) => EmailUtility.includes(otherEmails, email)) &&
            otherEmails.every((email) => EmailUtility.includes(emails, email))
        );
    }
}

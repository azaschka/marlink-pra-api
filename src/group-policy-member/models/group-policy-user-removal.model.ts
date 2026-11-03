export interface GroupPolicyUserRemoval {
    groupPolicyId: number;
    userId: number;
    /** Whether BeyondTrust held a direct membership of the user, which is now removed. */
    removed: boolean;
    /**
     * Whether BeyondTrust still reports the group policy for the user, through a provider default group policy or a
     * group mapping. Null when it was not requested or could not be determined.
     */
    stillHoldsGroupPolicy: boolean | null;
}

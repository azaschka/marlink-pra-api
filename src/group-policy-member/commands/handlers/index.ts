import { AddMemberToGroupPolicyCommandHandler } from './add-member-to-group-policy.command-handler';
import { RemoveMemberFromGroupPolicyCommandHandler } from './remove-member-from-group-policy.command-handler';
import { RemoveUserFromGroupPolicyCommandHandler } from './remove-user-from-group-policy.command-handler';

export const CommandHandlers = [
    AddMemberToGroupPolicyCommandHandler,
    RemoveMemberFromGroupPolicyCommandHandler,
    RemoveUserFromGroupPolicyCommandHandler,
];

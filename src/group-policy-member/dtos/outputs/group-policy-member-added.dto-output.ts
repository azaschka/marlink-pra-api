import { ApiProperty } from '@nestjs/swagger';
import { GroupPolicyMember } from '../../models';

export class GroupPolicyMemberAddedDtoOutput implements GroupPolicyMember {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the group policy.',
    })
    public groupPolicyId!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the member within the group policy.',
    })
    public memberId!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of a local, LDAP, RADIUS, Kerberos, or SAML user.',
    })
    public userId!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to a security provider.',
    })
    public securityProviderId!: number;

    @ApiProperty({
        required: false,
        type: String,
        description:
            'The distinguished name (DN) of the LDAP user, organizational unit (OU), or container. This attribute is only present for users and groups belonging to LDAP security providers.',
    })
    public distinguishedName?: string;

    @ApiProperty({
        required: false,
        type: String,
        description:
            'The name of the SAML or SCIM group. This attribute is only available for SAML or SCIM groups, as determined by the securityProviderId.',
    })
    public groupName?: string;
}

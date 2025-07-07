import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddMemberToGroupPolicyDtoInput {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of a local, LDAP, RADIUS, Kerberos, or SAML user.',
    })
    @IsInt()
    @IsNotEmpty()
    public userId!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to a security provider.',
    })
    @IsInt()
    @IsNotEmpty()
    public securityProviderId!: number;

    @ApiProperty({
        required: false,
        type: String,
        description:
            'The distinguished name (DN) of the LDAP user, organizational unit (OU), or container. This attribute is only present for users and groups belonging to LDAP security providers.',
    })
    @IsString()
    @IsOptional()
    public distinguishedName?: string;

    @ApiProperty({
        required: false,
        type: String,
        description:
            'The name of the SAML or SCIM group. This attribute is only available for SAML or SCIM groups, as determined by the securityProviderId.',
    })
    @IsString()
    @IsOptional()
    public groupName?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { NameSanitizerUtility } from '../../../shared/utilities';
import { JumpClientEndpointAgreementPolicyType, JumpClientGroupType } from '../../enums';

export class ModifyJumpClientDtoInput {
    @ApiProperty({
        required: false,
        type: Number,
        description: 'The unique identifier of the shared Jump Group or user that owns this Jump Client.',
    })
    @IsInt()
    @IsOptional()
    public jumpGroupId?: number;

    @ApiProperty({
        required: false,
        enum: JumpClientGroupType,
        description: 'The type of Jump Group that owns this Jump Client.',
    })
    @IsEnum(JumpClientGroupType)
    @IsOptional()
    public jumpGroupType?: JumpClientGroupType;

    @ApiProperty({ required: false, type: String, description: "The Jump Client's user-friendly name." })
    @IsString()
    @IsOptional()
    public name?: string;

    @ApiProperty({ required: false, type: String, description: "The Jump Client's tag." })
    @Transform(({ value }) => NameSanitizerUtility.sanitizeTag(value))
    @IsString()
    @IsOptional()
    public tag?: string;

    @ApiProperty({ required: false, type: String, description: "The Jump Client's comments." })
    @IsString()
    @IsOptional()
    public comments?: string;

    @ApiProperty({
        required: false,
        type: Number,
        nullable: true,
        description: 'The unique identifier of the Jump Policy used to manage access to this Jump Item.',
    })
    @IsInt()
    @IsOptional()
    public jumpPolicyId?: number | null;

    @ApiProperty({
        required: false,
        type: Number,
        nullable: true,
        description: 'The session policy used on the Jump Client system.',
    })
    @IsInt()
    @IsOptional()
    public sessionPolicyId?: number | null;

    @ApiProperty({
        required: false,
        type: Number,
        description:
            'The maximum number of minutes the Jump Client can be offline before being uninstalled. If 0, this Jump Client follows the global lost client settings.',
    })
    @IsInt()
    @IsOptional()
    public maxOfflineDurationInMinutes?: number;

    @ApiProperty({
        required: false,
        enum: JumpClientEndpointAgreementPolicyType,
        description:
            'The value accept will automatically accept the endpoint agreement if it times out and allow the session to start. The value reject will automatically reject the endpoint agreement and stop the session from starting. The value no-prompt will not show an endpoint agreement even if the feature is configured. This field has no effect if the global endpoint agreement setting is not enabled. This field is only available for GET and PATCH requests.',
    })
    @IsEnum(JumpClientEndpointAgreementPolicyType)
    @IsOptional()
    public endpointAgreementPolicyType?: JumpClientEndpointAgreementPolicyType;
}

import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import {
    ApprovalApproverScopeType,
    ApprovalScopeType,
    SimultaneousJumpsRdpType,
    SimultaneousJumpsType,
} from '../../enums';

export class CreateJumpPolicyDtoInput {
    @ApiProperty({
        type: String,
        required: true,
        description: 'The display name of the Jump Policy.',
    })
    @IsNotEmpty()
    @IsString()
    public displayName!: string;

    @ApiProperty({
        type: String,
        required: false,
        description: 'The code name of the Jump Policy.',
    })
    @IsOptional()
    @IsString()
    public codeName?: string;

    @ApiProperty({
        type: String,
        required: false,
        description: "The Jump Policy's comments.",
    })
    @IsOptional()
    @IsString()
    public description?: string;

    @ApiProperty({
        type: Boolean,
        required: false,
        description:
            'If true, users are restricted to accessing Jump Items within the scheduled hours. This setting cannot be enabled when require approval is true.',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    public hasScheduledAccessRestriction?: boolean;

    @ApiProperty({
        enum: SimultaneousJumpsType,
        required: false,
        description:
            'If set to join, once the first user is in a session, subsequent users will be able to enter the session. The first user will receive a notification that another user has joined the session, but the first user will not have an opportunity to deny access before other user joins. Selecting the global value means that the behavior defined in Jump Items will be used.',
        default: SimultaneousJumpsType.Global,
    })
    @IsOptional()
    @IsEnum(SimultaneousJumpsType)
    public simultaneousJumpsType?: SimultaneousJumpsType;

    @ApiProperty({
        type: Boolean,
        required: false,
        description:
            'This field is only valid if simultaneousJumpsType is set to join; otherwise, this field should be set to false or left unset. If true, a user will be allowed to join a session that was started from another copy of a Jump Client in a different Jump Group. Session permissions will be based on the original Jump Client that started the session. If false, a user will not be allowed to join a session that was started from another copy of a Jump Item unless it is the same Jump Group.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public doesSimultaneousJumpBehaviorApplyToCopies?: boolean;

    @ApiProperty({
        enum: SimultaneousJumpsRdpType,
        required: false,
        description:
            'If set to new-session, then a new independent session will start for each user which jumps to a specific RDP Jump Item, and the RDP configuration on the endpoint will control any further behavior regarding simultaneous RDP connections. Selecting the global value means that the behavior defined in Jump Items will be used.',
        default: SimultaneousJumpsRdpType.Global,
    })
    @IsOptional()
    @IsEnum(SimultaneousJumpsRdpType)
    public simultaneousJumpsRdpType?: SimultaneousJumpsRdpType;

    @ApiProperty({
        type: Boolean,
        required: false,
        description:
            'If true, users are forcefully removed from sessions when the schedule does not permit access. This can only be set to true if hasScheduledAccessRestriction is also true.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public shouldForceRemoveUsersWhenScheduleDisallows?: boolean;

    @ApiProperty({
        type: Boolean,
        required: false,
        description:
            'If true, users must enter a valid ticket ID that will be verified against the Ticket System configured in the Jump Policies. This setting has no effect if a Ticket System is not configured.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public isTicketIdRequired?: boolean;

    @ApiProperty({
        type: Boolean,
        required: false,
        description:
            'If true, users must have two factor authentication enabled and must complete a two factor challenge before starting a session.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public isTwoFactorChallengeRequired?: boolean;

    @ApiProperty({
        type: Boolean,
        required: false,
        description: 'If true, an email notification is sent to the configured recipients when a session starts.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public isSessionStartNotificationEnabled?: boolean;

    @ApiProperty({
        type: Boolean,
        required: false,
        description: 'If true, an email notification is sent to the configured recipients when a session ends.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public isSessionEndNotificationEnabled?: boolean;

    @ApiProperty({
        type: [String],
        required: false,
        description:
            'The list of email addresses to which session start and session end notifications will be sent. Required only if one or more notifications are enabled. The site must have an SMTP server configured on the Email Configuration.',
        default: [],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayUnique()
    public notificationEmailAddresses?: string[];

    @ApiProperty({
        type: String,
        required: false,
        description:
            'The display name of the recipients shown to users. Required in POST only if one or more notifications are enabled.',
    })
    @IsOptional()
    @IsString()
    public notificationDisplayName?: string;

    @ApiProperty({
        type: String,
        required: false,
        description:
            'The language in which notification emails will be sent. Must be the locale code for one of the locales listed.',
        default: 'en-us',
    })
    @IsOptional()
    @IsString()
    public notificationEmailLanguage?: string;

    @ApiProperty({
        type: Boolean,
        required: false,
        description:
            'If true, users must wait for approval from one of the approvers before they can start a session. This setting cannot be enabled when hasScheduledAccessRestriction is true.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public isApprovalRequired?: boolean;

    @ApiProperty({
        type: Number,
        required: false,
        description:
            'The number of minutes a user is allowed to access the Jump Item after approval is granted. The maximum is 52 weeks in minutes.',
        default: 480,
    })
    @IsOptional()
    @IsNumber()
    public approvalMaxDurationInMinutes?: number;

    @ApiProperty({
        enum: ApprovalScopeType,
        required: false,
        description:
            'The scope of access granted by approvals. If "requestor", only the requestor has access. If "anyone", anyone who is permitted to request access has access.',
        default: ApprovalScopeType.Requestor,
    })
    @IsOptional()
    @IsEnum(ApprovalScopeType)
    public approvalScopeType?: ApprovalScopeType;

    @ApiProperty({
        type: [String],
        required: false,
        description:
            'The list of email addresses to which approval requests will be sent. It is required only if approvals are enabled. The site must have an SMTP server configured on the Email Configuration.',
        default: [],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayUnique()
    public approvalEmailAddresses?: string[];

    @ApiProperty({
        type: [String],
        required: false,
        description:
            'The list of user ids to which approval requests will be sent. It is required only if approvals are enabled.',
        default: [],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayUnique()
    public approvalUserIds?: string[];

    @ApiProperty({
        type: [String],
        required: false,
        description:
            'The list of team ids to which approval requests will be sent. It is required only if approvals are enabled.',
        default: [],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayUnique()
    public approvalTeamIds?: string[];

    @ApiProperty({
        type: String,
        required: false,
        description:
            'The display name of the approvers that requestors will see. It is required only if approvals are enabled.',
    })
    @IsOptional()
    @IsString()
    public approvalDisplayName?: string;

    @ApiProperty({
        type: String,
        required: false,
        description:
            'The language in which approval emails will be sent. Must be the locale code for one of the locales listed.',
        default: 'en-us',
    })
    @IsOptional()
    @IsString()
    public approvalEmailLanguage?: string;

    @ApiProperty({
        enum: ApprovalApproverScopeType,
        required: false,
        description:
            'The scope of approval granted to approvers. If "not-requestor", then the approver cannot approve their own requests. If "anyone", anyone who is permitted to approve, can approve requests, including their own.',
        default: ApprovalApproverScopeType.NotRequestor,
    })
    @IsOptional()
    @IsEnum(ApprovalApproverScopeType)
    public approvalApproverScopeType?: ApprovalApproverScopeType;

    @ApiProperty({
        type: Boolean,
        required: false,
        description:
            'If true, sessions will not be recorded even if recordings configurations are enabled. This affects Screen Sharing, User Recordings for Protocol Tunnel Jump, and Shell recordings',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public isRecordingsDisabled?: boolean;
}

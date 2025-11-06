import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
    UseInterceptors,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AccessGuard } from '../../access/guards';
import {
    ApiAccessKeyHeader,
    ApiTenantIdHeader,
    ApiTransactionIdHeader,
    TenantIdHeader,
    TransactionIdHeader,
} from '../../core/decorators';
import { CustomersScopeInterceptor } from '../../customer/interceptors';
import { NonEmptyBodyPipe } from '../../shared/pipes';
import { UuidUtility } from '../../shared/utilities';
import { CreateGroupPolicyCommand, DeleteGroupPolicyCommand, ModifyGroupPolicyCommand } from '../commands';
import { CreateGroupPolicyDtoInput, ModifyGroupPolicyDtoInput, RetrieveGroupPoliciesDtoInput } from '../dtos/inputs';
import {
    GroupPolicyCreatedDtoOutput,
    GroupPolicyModifiedDtoOutput,
    GroupPolicyRetrievedDtoOutput,
} from '../dtos/outputs';
import { GroupPolicy } from '../models';
import { GroupPolicyRequestPipe } from '../pipes';
import { RetrieveGroupPoliciesQuery, RetrieveGroupPolicyByIdQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Group Policies')
@Controller('group-policies')
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor)
@UsePipes(GroupPolicyRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class GroupPolicyController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({ type: GroupPolicyRetrievedDtoOutput })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async retrieveGroupPolicy(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<GroupPolicyRetrievedDtoOutput> {
        const result = await this.queryBus.execute<RetrieveGroupPolicyByIdQuery, GroupPolicy>(
            new RetrieveGroupPolicyByIdQuery(transactionId, tenantId, id),
        );

        return result;
    }

    @Get()
    @ApiOkResponse({ type: GroupPolicyRetrievedDtoOutput, isArray: true })
    public async retrieveGroupPolicies(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() dtoInput: RetrieveGroupPoliciesDtoInput,
    ): Promise<GroupPolicyRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
            new RetrieveGroupPoliciesQuery(
                transactionId,
                tenantId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.name,
                dtoInput.namePatterns,
            ),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({
        type: GroupPolicyCreatedDtoOutput,
        description: 'Indicates the group policy was created successfully and contains the new group policy instance.',
    })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async createGroupPolicy(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Body() dtoInput: CreateGroupPolicyDtoInput,
    ): Promise<GroupPolicyCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateGroupPolicyCommand, GroupPolicy>(
            new CreateGroupPolicyCommand(
                transactionId,
                tenantId,
                dtoInput.name,
                dtoInput.hasEndpointsAccessPermission,
                dtoInput.accessPermissionStatusType,
                dtoInput.hasShareOtherTeamPermission,
                dtoInput.hasInviteExternalUserPermission,
                dtoInput.userSessionIdleTimeoutInSeconds,
                dtoInput.hasEnableExtendedAvailabilityModePermission,
                dtoInput.hasEditExternalKeyPermission,
                dtoInput.hasCollaboratePermission,
                dtoInput.hasCollaborateControlPermission,
                dtoInput.hasJumpClientPermission,
                dtoInput.hasLocalJumpPermission,
                dtoInput.hasRemoteJumpPermission,
                dtoInput.hasRemoteVncPermission,
                dtoInput.hasRemoteRdpPermission,
                dtoInput.hasShellJumpPermission,
                dtoInput.hasWebJumpPermission,
                dtoInput.hasProtocolTunnelPermission,
                dtoInput.hasSdStaticPortForExternalToolsPermission,
                dtoInput.defaultJumpItemRoleId,
                dtoInput.privateJumpItemRoleId,
                dtoInput.inferiorJumpItemRoleId,
                dtoInput.unassignedJumpItemRoleId,
            ),
        );

        return result;
    }

    @Patch(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: GroupPolicyModifiedDtoOutput,
        description: 'Indicates the existing group policy was successfully updated and returns the new group policy.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async modifyGroupPolicy(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyGroupPolicyDtoInput,
    ): Promise<GroupPolicyModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyGroupPolicyCommand, GroupPolicy>(
            new ModifyGroupPolicyCommand(
                transactionId,
                tenantId,
                id,
                dtoInput.name,
                dtoInput.hasEndpointsAccessPermission,
                dtoInput.accessPermissionStatusType,
                dtoInput.hasShareOtherTeamPermission,
                dtoInput.hasInviteExternalUserPermission,
                dtoInput.userSessionIdleTimeoutInSeconds,
                dtoInput.hasEnableExtendedAvailabilityModePermission,
                dtoInput.hasEditExternalKeyPermission,
                dtoInput.hasCollaboratePermission,
                dtoInput.hasCollaborateControlPermission,
                dtoInput.hasJumpClientPermission,
                dtoInput.hasLocalJumpPermission,
                dtoInput.hasRemoteJumpPermission,
                dtoInput.hasRemoteVncPermission,
                dtoInput.hasRemoteRdpPermission,
                dtoInput.hasShellJumpPermission,
                dtoInput.hasWebJumpPermission,
                dtoInput.hasProtocolTunnelPermission,
                dtoInput.hasSdStaticPortForExternalToolsPermission,
                dtoInput.defaultJumpItemRoleId,
                dtoInput.privateJumpItemRoleId,
                dtoInput.inferiorJumpItemRoleId,
                dtoInput.unassignedJumpItemRoleId,
            ),
        );

        return result;
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the group policy was successfully deleted.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async deleteGroupPolicy(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteGroupPolicyCommand, void>(
            new DeleteGroupPolicyCommand(transactionId, tenantId, id),
        );
    }
}

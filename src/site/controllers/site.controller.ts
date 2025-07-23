import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { ApiTransactionIdHeader, TransactionIdHeader } from '../../core/decorators';
import { JumpointRetrievedDtoOutput } from '../../jumpoint/dtos/outputs';
import { UuidUtility } from '../../shared/utilities';
import {
    AddSiteAdministratorCommand,
    AddSiteManagerCommand,
    AddSiteSupportTeamMemberCommand,
    CreateSiteCommand,
    DeleteSiteCommand,
    RemoveSiteAdministratorCommand,
    RemoveSiteManagerCommand,
    RemoveSiteSupportTeamMemberCommand,
} from '../commands';
import {
    CreateSiteDtoInput,
    RetrieveSiteJumpointsDtoInput,
    RetrieveSitesDtoInput,
    SiteAdministratorDtoInput,
    SiteManagerDtoInput,
    SiteSupportTeamMemberDtoInput,
} from '../dtos/inputs';
import {
    SiteAdministratorDtoOutput,
    SiteCreatedDtoOutput,
    SiteManagerDtoOutput,
    SiteRetrievedDtoOutput,
    SiteSupportTeamMemberDtoOutput,
} from '../dtos/outputs';
import { Site, SiteAdministrator, SiteManager, SiteSupportTeamMember } from '../models';
import { RetrieveSiteJumpointsQuery, RetrieveSitesQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiTags('Sites')
@Controller('sites')
@UsePipes(new ValidationPipe({ transform: true }))
export class SiteController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: SiteRetrievedDtoOutput, isArray: true })
    public async retrieveSites(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Query() dtoInput: RetrieveSitesDtoInput,
    ): Promise<SiteRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveSitesQuery, Site[]>(
            new RetrieveSitesQuery(
                transactionId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.key,
                dtoInput.name,
                dtoInput.customerKey,
            ),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({
        type: SiteCreatedDtoOutput,
        description: 'Indicates the site was created successfully and contains the new site.',
    })
    @ApiConflictResponse({
        description: 'The specified site already exists.',
    })
    @ApiNotFoundResponse({ description: 'The customer key is not found.' })
    public async createSite(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Body() dtoInput: CreateSiteDtoInput,
    ): Promise<SiteCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateSiteCommand, Site>(
            new CreateSiteCommand(
                transactionId,
                dtoInput.key,
                dtoInput.name,
                dtoInput.customerKey,
                dtoInput.siteManagers,
                dtoInput.siteAdministrators ?? [],
                dtoInput.siteSupportTeamMembers ?? [],
            ),
        );

        return result;
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the site was successfully deleted.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async deleteSite(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteSiteCommand, void>(new DeleteSiteCommand(transactionId, id));
    }

    @Post(':id/manager')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiCreatedResponse({
        type: SiteManagerDtoOutput,
        description: 'Indicates the site manager was added successfully.',
    })
    @ApiConflictResponse({
        description: 'The specified site manager already exists.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async addSiteManager(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body() dtoInput: SiteManagerDtoInput,
    ): Promise<SiteManagerDtoOutput> {
        const result = await this.commandBus.execute<AddSiteManagerCommand, SiteManager>(
            new AddSiteManagerCommand(transactionId, id, dtoInput.username, dtoInput.email),
        );

        return result;
    }

    @Delete(':id/manager/:managerId')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiParam({
        name: 'managerId',
        type: Number,
        required: true,
        description: 'Unique identifier for the site manager.',
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the site manager was successfully removed.' })
    @ApiConflictResponse({
        description: 'The specified site manager cannot be removed due to minimum count requirements.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async removeSiteManager(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Param('managerId') managerId: number,
    ): Promise<void> {
        await this.commandBus.execute<RemoveSiteManagerCommand, void>(
            new RemoveSiteManagerCommand(transactionId, id, managerId),
        );
    }

    @Post(':id/administrator')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiCreatedResponse({
        type: SiteAdministratorDtoOutput,
        description: 'Indicates the site administrator was added successfully.',
    })
    @ApiConflictResponse({
        description: 'The specified site administrator already exists.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async addSiteAdministrator(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body() dtoInput: SiteAdministratorDtoInput,
    ): Promise<SiteAdministratorDtoOutput> {
        const result = await this.commandBus.execute<AddSiteAdministratorCommand, SiteAdministrator>(
            new AddSiteAdministratorCommand(
                transactionId,
                id,
                dtoInput.username,
                dtoInput.email,
                dtoInput.isAdminOperator,
            ),
        );

        return result;
    }

    @Delete(':id/administrator/:administratorId')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiParam({
        name: 'administratorId',
        type: Number,
        required: true,
        description: 'Unique identifier for the site administrator.',
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the site administrator was successfully removed.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async removeSiteAdministrator(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Param('administratorId') administratorId: number,
    ): Promise<void> {
        await this.commandBus.execute<RemoveSiteAdministratorCommand, void>(
            new RemoveSiteAdministratorCommand(transactionId, id, administratorId),
        );
    }

    @Post(':id/support-team-member')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiCreatedResponse({
        type: SiteSupportTeamMemberDtoInput,
        description: 'Indicates the site support team member was added successfully.',
    })
    @ApiConflictResponse({
        description: 'The specified site support team member already exists.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async addSiteSupportTeamMember(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body() dtoInput: SiteSupportTeamMemberDtoInput,
    ): Promise<SiteSupportTeamMemberDtoOutput> {
        const result = await this.commandBus.execute<AddSiteSupportTeamMemberCommand, SiteSupportTeamMember>(
            new AddSiteSupportTeamMemberCommand(
                transactionId,
                id,
                dtoInput.firstname,
                dtoInput.lastname,
                dtoInput.email,
                dtoInput.supportTeamName,
                dtoInput.supportTeamAccessLevel,
                dtoInput.supportTeamTrustLevel,
            ),
        );

        return result;
    }

    @Delete(':id/support-team-member/:supportTeamMemberId')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiParam({
        name: 'supportTeamMemberId',
        type: Number,
        required: true,
        description: 'Unique identifier for the site support team member.',
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the site support team member was successfully removed.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async removeSiteSupportTeamMember(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Param('supportTeamMemberId') supportTeamMemberId: number,
    ): Promise<void> {
        await this.commandBus.execute<RemoveSiteSupportTeamMemberCommand, void>(
            new RemoveSiteSupportTeamMemberCommand(transactionId, id, supportTeamMemberId),
        );
    }

    @Get(':id/jumpoints')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the site.' })
    @ApiOkResponse({
        type: JumpointRetrievedDtoOutput,
        isArray: true,
        description: 'Returns a list of jumpoints associated with the specified site.',
    })
    @ApiNotFoundResponse({ description: 'The specified site was not found.' })
    public async getSiteJumpoints(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Query() dtoInput: RetrieveSiteJumpointsDtoInput,
        @Param('id') id: number,
    ) {
        const result = await this.queryBus.execute<RetrieveSiteJumpointsQuery, JumpointRetrievedDtoOutput[]>(
            new RetrieveSiteJumpointsQuery(transactionId, dtoInput.pageSize, dtoInput.pageNumber, id),
        );

        return result;
    }
}

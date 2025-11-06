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
    UseGuards,
    UseInterceptors,
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
import { AccessGuard } from '../../access/guards';
import { ApiAccessKeyHeader, ApiTransactionIdHeader, TransactionIdHeader } from '../../core/decorators';
import { CustomersScopeInterceptor } from '../../customer/interceptors';
import { UuidUtility } from '../../shared/utilities';
import { AddSiteSupportTeamMemberCommand, RemoveSiteSupportTeamMemberCommand } from '../commands';
import { RetrieveSiteSupportTeamMembersDtoInput, SiteSupportTeamMemberDtoInput } from '../dtos/inputs';
import { SiteSupportTeamMemberDtoOutput } from '../dtos/outputs';
import { SiteSupportTeamMember } from '../models';
import { SiteRequestPipe } from '../pipes';
import { RetrieveSiteSupportTeamMembersQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Sites')
@Controller('sites/:id/support-team-members')
@ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the site.' })
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor)
@UsePipes(SiteRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class SiteSupportTeamMemberController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: SiteSupportTeamMemberDtoOutput, isArray: true })
    public async retrieveSiteSupportTeamMembers(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Query() dtoInput: RetrieveSiteSupportTeamMembersDtoInput,
    ): Promise<SiteSupportTeamMemberDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveSiteSupportTeamMembersQuery, SiteSupportTeamMember[]>(
            new RetrieveSiteSupportTeamMembersQuery(transactionId, dtoInput.pageSize, dtoInput.pageNumber, id),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({
        type: SiteSupportTeamMemberDtoOutput,
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

    @Delete(':supportTeamMemberId')
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
}

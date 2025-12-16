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
import { MonitoringRequestPipe } from '../../monitoring/pipes';
import { UuidUtility } from '../../shared/utilities';
import { AddSiteAuditorCommand, RemoveSiteAuditorCommand } from '../commands';
import { RetrieveSiteAuditorsDtoInput, SiteAuditorDtoInput } from '../dtos/inputs';
import { SiteAuditorDtoOutput } from '../dtos/outputs';
import { SiteAuditor } from '../models';
import { SiteRequestPipe } from '../pipes';
import { RetrieveSiteAuditorsQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Sites')
@Controller('sites/:id/auditors')
@ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the site.' })
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor)
@UsePipes(MonitoringRequestPipe)
@UsePipes(SiteRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class SiteAuditorController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: SiteAuditorDtoOutput, isArray: true })
    public async retrieveSiteAuditors(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Query() dtoInput: RetrieveSiteAuditorsDtoInput,
    ): Promise<SiteAuditorDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveSiteAuditorsQuery, SiteAuditor[]>(
            new RetrieveSiteAuditorsQuery(transactionId, dtoInput.pageSize, dtoInput.pageNumber, id),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({
        type: SiteAuditorDtoOutput,
        description: 'Indicates the site auditor was added successfully.',
    })
    @ApiConflictResponse({
        description: 'The specified site auditor already exists.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async addSiteAuditor(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body() dtoInput: SiteAuditorDtoInput,
    ): Promise<SiteAuditorDtoOutput> {
        const result = await this.commandBus.execute<AddSiteAuditorCommand, SiteAuditor>(
            new AddSiteAuditorCommand(transactionId, id, dtoInput.username, dtoInput.email, dtoInput.isAdminOperator),
        );

        return result;
    }

    @Delete(':auditorId')
    @ApiParam({
        name: 'auditorId',
        type: Number,
        required: true,
        description: 'Unique identifier for the site auditor.',
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the site auditor was successfully removed.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async removeSiteAuditor(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Param('auditorId') auditorId: number,
    ): Promise<void> {
        await this.commandBus.execute<RemoveSiteAuditorCommand, void>(
            new RemoveSiteAuditorCommand(transactionId, id, auditorId),
        );
    }
}

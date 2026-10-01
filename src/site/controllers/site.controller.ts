import {
    Body,
    Controller,
    Delete,
    Get,
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
import { CreateSiteCommand, DeleteSiteCommand } from '../commands';
import { ErrorReport } from '../error-reports';
import { CreateSiteDtoInput, RetrieveSitesDtoInput } from '../dtos/inputs';
import { SiteDeletedDtoOutput, SiteProcessingResultDtoOutput, SiteRetrievedDtoOutput } from '../dtos/outputs';
import { Site, SiteProcessingResult } from '../models';
import { SiteRequestPipe } from '../pipes';
import { RetrieveSitesQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Sites')
@Controller('sites')
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor)
@UsePipes(MonitoringRequestPipe)
@UsePipes(SiteRequestPipe)
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
                dtoInput.customerKeys,
            ),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({
        type: SiteProcessingResultDtoOutput,
        description: 'Indicates the site was created successfully and contains the processing result.',
    })
    @ApiConflictResponse({
        description: 'The specified site already exists.',
    })
    @ApiNotFoundResponse({ description: 'The customer key is not found.' })
    public async createSite(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Body() dtoInput: CreateSiteDtoInput,
    ): Promise<SiteProcessingResultDtoOutput> {
        const result = await this.commandBus.execute<CreateSiteCommand, SiteProcessingResult>(
            new CreateSiteCommand(
                transactionId,
                dtoInput.key,
                dtoInput.name,
                dtoInput.customerKey,
                dtoInput.siteManagers,
                // EXT-08: an omitted list keeps the existing entries of an existing site; [] removes them.
                dtoInput.siteAuditors,
                dtoInput.siteSupportTeamMembers,
                dtoInput.siteApprovers,
            ),
        );

        return SiteProcessingResultDtoOutput.create(result);
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: SiteDeletedDtoOutput,
        description:
            'Indicates the site was deleted and reports which BeyondTrust artefacts could not be removed. ' +
            'An empty error report means the cleanup completed.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async deleteSite(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<SiteDeletedDtoOutput> {
        const errorReport = await this.commandBus.execute<DeleteSiteCommand, ErrorReport>(
            new DeleteSiteCommand(transactionId, id),
        );

        return SiteDeletedDtoOutput.create(errorReport);
    }
}

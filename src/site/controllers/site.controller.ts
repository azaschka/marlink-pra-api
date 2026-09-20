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
import { CreateSiteCommand, DeleteSiteCommand } from '../commands';
import { CreateSiteDtoInput, RetrieveSitesDtoInput } from '../dtos/inputs';
import { SiteProcessingResultDtoOutput, SiteRetrievedDtoOutput } from '../dtos/outputs';
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
                dtoInput.siteAuditors ?? [],
                dtoInput.siteSupportTeamMembers ?? [],
                dtoInput.siteApprovers ?? [],
            ),
        );

        return SiteProcessingResultDtoOutput.create(result);
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
}

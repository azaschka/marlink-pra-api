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
} from '@nestjs/swagger';
import { ApiTransactionIdHeader, TransactionIdHeader } from '../../core/decorators';
import { NonEmptyBodyPipe } from '../../shared/pipes';
import { UuidUtility } from '../../shared/utilities';
import { CreateSiteCommand, DeleteSiteCommand, ModifySiteCommand } from '../commands';
import { CreateSiteDtoInput, ModifySiteDtoInput, RetrieveSitesDtoInput } from '../dtos/inputs';
import { SiteCreatedDtoOutput, SiteModifiedDtoOutput, SiteRetrievedDtoOutput } from '../dtos/outputs';
import { Site } from '../models';
import { RetrieveSitesQuery } from '../queries';

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
                dtoInput.customerName,
            ),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({
        type: SiteCreatedDtoOutput,
        description: 'Indicates the site was created successfully and contains the new site.',
    })
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
                dtoInput.customerName,
                dtoInput.approverUsername,
                dtoInput.approverEmail,
            ),
        );

        return result;
    }

    @Patch(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: SiteModifiedDtoOutput,
        description: 'Indicates the site was successfully updated and contains the updated site.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async modifySite(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifySiteDtoInput,
    ): Promise<SiteModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifySiteCommand, Site>(
            new ModifySiteCommand(
                transactionId,
                id,
                dtoInput.customerKey,
                dtoInput.customerName,
                dtoInput.approverUsername,
                dtoInput.approverEmail,
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
}

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
import { UuidUtility } from '../../shared/utilities';
import { AddSiteManagerCommand, RemoveSiteManagerCommand } from '../commands';
import { RetrieveSiteManagersDtoInput, SiteManagerDtoInput } from '../dtos/inputs';
import { SiteManagerDtoOutput } from '../dtos/outputs';
import { SiteManager } from '../models';
import { RetrieveSiteManagersQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiTags('Sites')
@Controller('sites/:id/managers')
@ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the site.' })
@UsePipes(new ValidationPipe({ transform: true }))
export class SiteManagerController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: SiteManagerDtoOutput, isArray: true })
    public async retrieveSiteManagers(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Query() dtoInput: RetrieveSiteManagersDtoInput,
    ): Promise<SiteManagerDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveSiteManagersQuery, SiteManager[]>(
            new RetrieveSiteManagersQuery(transactionId, dtoInput.pageSize, dtoInput.pageNumber, id),
        );

        return result;
    }

    @Post()
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

    @Delete(':managerId')
    @ApiParam({
        name: 'managerId',
        type: Number,
        required: true,
        description: 'Unique identifier for the site manager.',
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the site manager was successfully removed.' })
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
}

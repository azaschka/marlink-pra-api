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
import { AddSiteAdministratorCommand, RemoveSiteAdministratorCommand } from '../commands';
import { RetrieveSiteAdministratorsDtoInput, SiteAdministratorDtoInput } from '../dtos/inputs';
import { SiteAdministratorDtoOutput } from '../dtos/outputs';
import { SiteAdministrator } from '../models';
import { RetrieveSiteAdministratorsQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiTags('Sites')
@Controller('sites/:id/administrators')
@ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the site.' })
@UsePipes(new ValidationPipe({ transform: true }))
export class SiteAdministratorController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: SiteAdministratorDtoOutput, isArray: true })
    public async retrieveSiteAdministrators(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Query() dtoInput: RetrieveSiteAdministratorsDtoInput,
    ): Promise<SiteAdministratorDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveSiteAdministratorsQuery, SiteAdministrator[]>(
            new RetrieveSiteAdministratorsQuery(transactionId, dtoInput.pageSize, dtoInput.pageNumber, id),
        );

        return result;
    }

    @Post()
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

    @Delete(':administratorId')
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
}

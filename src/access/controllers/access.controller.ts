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
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiExcludeController,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { ApiTransactionIdHeader, TransactionIdHeader } from '../../core/decorators';
import { NonEmptyBodyPipe } from '../../shared/pipes';
import { UuidUtility } from '../../shared/utilities';
import { CreateAccessCommand, DeleteAccessCommand, ModifyAccessCommand } from '../commands';
import { CreateAccessDtoInput, ModifyAccessDtoInput, RetrieveAccessDtoInput } from '../dtos/inputs';
import { AccessCreatedDtoOutput, AccessModifiedDtoOutput, AccessRetrievedDtoOutput } from '../dtos/outputs';
import { Access } from '../models';
import { RetrieveAccessQuery } from '../queries';
import { ApiKeyAuthGuard } from '../../auth/guards';

@ApiTransactionIdHeader()
@ApiTags('Access')
@Controller('access')
@UseGuards(ApiKeyAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
@ApiExcludeController()
export class AccessController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: AccessRetrievedDtoOutput, isArray: true })
    public async retrieveAccess(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Query() dtoInput: RetrieveAccessDtoInput,
    ): Promise<AccessRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveAccessQuery, Access[]>(
            new RetrieveAccessQuery(transactionId, dtoInput.pageSize, dtoInput.pageNumber, dtoInput.key, dtoInput.name),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({
        type: AccessCreatedDtoOutput,
        description: 'Indicates the access was created successfully and contains the new access.',
    })
    @ApiConflictResponse({ description: 'An access with the specified key already exists.' })
    public async createAccess(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Body() dtoInput: CreateAccessDtoInput,
    ): Promise<AccessCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateAccessCommand, Access>(
            new CreateAccessCommand(transactionId, dtoInput.key, dtoInput.name, dtoInput.value),
        );

        return result;
    }

    @Patch(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: AccessModifiedDtoOutput,
        description: 'Indicates the access was successfully updated and contains the updated access.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async modifyAccess(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyAccessDtoInput,
    ): Promise<AccessModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyAccessCommand, Access>(
            new ModifyAccessCommand(transactionId, id, dtoInput.key, dtoInput.name, dtoInput.value),
        );

        return result;
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the access was successfully deleted.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async deleteAccess(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteAccessCommand, void>(new DeleteAccessCommand(transactionId, id));
    }
}

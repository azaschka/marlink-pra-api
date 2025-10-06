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
import {
    CreateBeyondtrustInstanceCommand,
    DeleteBeyondtrustInstanceCommand,
    ModifyBeyondtrustInstanceCommand,
} from '../commands';
import {
    CreateBeyondtrustInstanceDtoInput,
    ModifyBeyondtrustInstanceDtoInput,
    RetrieveBeyondtrustInstancesDtoInput,
} from '../dtos/inputs';
import {
    BeyondtrustInstanceCreatedDtoOutput,
    BeyondtrustInstanceModifiedDtoOutput,
    BeyondtrustInstanceRetrievedDtoOutput,
} from '../dtos/outputs';
import { BeyondtrustInstance } from '../models';
import { RetrieveBeyondtrustInstancesQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiTags('Beyondtrust Instances')
@Controller('beyondtrust-instances')
@UsePipes(new ValidationPipe({ transform: true }))
export class BeyondtrustInstanceController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: BeyondtrustInstanceRetrievedDtoOutput, isArray: true })
    public async retrieveBeyondtrustInstances(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Query() dtoInput: RetrieveBeyondtrustInstancesDtoInput,
    ): Promise<BeyondtrustInstanceRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveBeyondtrustInstancesQuery, BeyondtrustInstance[]>(
            new RetrieveBeyondtrustInstancesQuery(
                transactionId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.name,
                dtoInput.oauth2TokenUrl,
                dtoInput.apiBaseUrl,
            ),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({
        type: BeyondtrustInstanceCreatedDtoOutput,
        description:
            'Indicates the BeyondTrust instance was created successfully and contains the new BeyondTrust instance.',
    })
    public async createBeyondtrustInstance(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Body() dtoInput: CreateBeyondtrustInstanceDtoInput,
    ): Promise<BeyondtrustInstanceCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateBeyondtrustInstanceCommand, BeyondtrustInstance>(
            new CreateBeyondtrustInstanceCommand(
                transactionId,
                dtoInput.name,
                dtoInput.authClientId,
                dtoInput.authClientSecret,
                dtoInput.oauth2TokenUrl,
                dtoInput.apiBaseUrl,
                dtoInput.billingType,
            ),
        );

        return result;
    }

    @Patch(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: BeyondtrustInstanceModifiedDtoOutput,
        description:
            'Indicates the BeyondTrust instance was successfully updated and contains the updated BeyondTrust instance.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async modifyBeyondtrustInstance(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyBeyondtrustInstanceDtoInput,
    ): Promise<BeyondtrustInstanceModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyBeyondtrustInstanceCommand, BeyondtrustInstance>(
            new ModifyBeyondtrustInstanceCommand(
                transactionId,
                id,
                dtoInput.name,
                dtoInput.authClientId,
                dtoInput.authClientSecret,
                dtoInput.oauth2TokenUrl,
                dtoInput.apiBaseUrl,
                dtoInput.billingType,
            ),
        );

        return result;
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the BeyondTrust instance was successfully deleted.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async deleteBeyondtrustInstance(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteBeyondtrustInstanceCommand, void>(
            new DeleteBeyondtrustInstanceCommand(transactionId, id),
        );
    }
}

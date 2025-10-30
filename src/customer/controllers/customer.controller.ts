import {
    Body,
    Controller,
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
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiAccessKeyHeader, ApiTransactionIdHeader, TransactionIdHeader } from '../../core/decorators';
import { NonEmptyBodyPipe } from '../../shared/pipes';
import { UuidUtility } from '../../shared/utilities';
import {
    CreateCustomerCommand,
    DeactivateCustomerCommand,
    ModifyCustomerCommand,
    ReactivateCustomerCommand,
} from '../commands';
import { CreateCustomerDtoInput, ModifyCustomerDtoInput, RetrieveCustomersDtoInput } from '../dtos/inputs';
import { CustomerCreatedDtoOutput, CustomerModifiedDtoOutput, CustomerRetrievedDtoOutput } from '../dtos/outputs';
import { Customer } from '../models';
import { RetrieveCustomersQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Customers')
@Controller('customers')
@UsePipes(new ValidationPipe({ transform: true }))
export class CustomerController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: CustomerRetrievedDtoOutput, isArray: true })
    public async retrieveCustomers(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Query() dtoInput: RetrieveCustomersDtoInput,
    ): Promise<CustomerRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
            new RetrieveCustomersQuery(
                transactionId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.key,
                dtoInput.name,
                undefined,
                dtoInput.businessUnits,
            ),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({
        type: CustomerCreatedDtoOutput,
        description: 'Indicates the customer was created successfully and contains the new customer.',
    })
    @ApiConflictResponse({
        description: 'The specified customer already exists.',
    })
    @ApiUnprocessableEntityResponse({
        description: 'Failed in downstream process. Most likely in creating admin group policy.',
    })
    public async createCustomer(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Body() dtoInput: CreateCustomerDtoInput,
    ): Promise<CustomerCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateCustomerCommand, Customer>(
            new CreateCustomerCommand(
                transactionId,
                dtoInput.key,
                dtoInput.name,
                dtoInput.businessUnit,
                dtoInput.beyondtrustInstanceId,
            ),
        );

        return result;
    }

    @Patch(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: CustomerModifiedDtoOutput,
        description: 'Indicates the customer was successfully updated and contains the updated customer.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async modifyCustomer(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyCustomerDtoInput,
    ): Promise<CustomerModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyCustomerCommand, Customer>(
            new ModifyCustomerCommand(transactionId, id, dtoInput.beyondtrustInstanceId),
        );

        return result;
    }

    @Post(':id/deactivate')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ description: 'Indicates the customer was successfully deactivated.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async deactivateCustomer(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeactivateCustomerCommand, void>(
            new DeactivateCustomerCommand(transactionId, id),
        );
    }

    @Post(':id/reactivate')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ description: 'Indicates the customer was successfully reactivated.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async reactivateCustomer(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<ReactivateCustomerCommand, void>(
            new ReactivateCustomerCommand(transactionId, id),
        );
    }
}

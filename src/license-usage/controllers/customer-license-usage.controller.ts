import {
    Controller,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    UseGuards,
    UseInterceptors,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiNotFoundResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { AccessGuard } from '../../access/guards';
import { ApiAccessKeyHeader, ApiTransactionIdHeader, TransactionIdHeader } from '../../core/decorators';
import { CustomersScopeInterceptor } from '../../customer/interceptors';
import { MonitoringRequestPipe } from '../../monitoring/pipes';
import { UuidUtility } from '../../shared/utilities';
import { CalculateCustomerLicenseUsageCommand } from '../commands';
import { CustomerLicenseUsageDtoOutput } from '../dtos/outputs';
import { CustomerLicenseUsage } from '../models';
import { CustomerLicenseUsageRequestPipe } from '../pipes';

@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('License Usage')
@Controller('license-usages')
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor)
@UsePipes(MonitoringRequestPipe)
@UsePipes(CustomerLicenseUsageRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class CustomerLicenseUsageController {
    constructor(private readonly commandBus: CommandBus) {}

    @Post('customers/:id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        type: CustomerLicenseUsageDtoOutput,
        description: 'Indicates the customer license usage was successfully calculated.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async calculateCustomerLicenseUsage(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<CustomerLicenseUsageDtoOutput> {
        const result = await this.commandBus.execute<CalculateCustomerLicenseUsageCommand, CustomerLicenseUsage>(
            new CalculateCustomerLicenseUsageCommand(transactionId, id),
        );

        return result;
    }
}

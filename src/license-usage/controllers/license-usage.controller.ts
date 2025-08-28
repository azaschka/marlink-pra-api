import { Controller, HttpCode, HttpStatus, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiNotFoundResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiTransactionIdHeader, TransactionIdHeader } from '../../core/decorators';
import { UuidUtility } from '../../shared/utilities';
import { CalculateCustomerLicenseUsageCommand, CalculateSiteLicenseUsageCommand } from '../commands';
import { CustomerLicenseUsageDtoOutput, SiteLicenseUsageDtoOutput } from '../dtos/outputs';
import { CustomerLicenseUsage, SiteLicenseUsage } from '../models';

@ApiTransactionIdHeader()
@ApiTags('License Usage')
@Controller('license-usages')
@UsePipes(new ValidationPipe({ transform: true }))
export class LicenseUsageController {
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

    @Post('sites/:id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        type: SiteLicenseUsageDtoOutput,
        description: 'Indicates the site license usage was successfully calculated.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async calculateSiteLicenseUsage(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<SiteLicenseUsageDtoOutput> {
        const result = await this.commandBus.execute<CalculateSiteLicenseUsageCommand, SiteLicenseUsage>(
            new CalculateSiteLicenseUsageCommand(transactionId, id),
        );

        return result;
    }
}

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
import { UuidUtility } from '../../shared/utilities';
import { CalculateSiteLicenseUsageCommand } from '../commands';
import { SiteLicenseUsageDtoOutput } from '../dtos/outputs';
import { SiteLicenseUsage } from '../models';
import { SiteLicenseUsageRequestPipe } from '../pipes';

@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('License Usage')
@Controller('license-usages')
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor)
@UsePipes(SiteLicenseUsageRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class SiteLicenseUsageController {
    constructor(private readonly commandBus: CommandBus) {}

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

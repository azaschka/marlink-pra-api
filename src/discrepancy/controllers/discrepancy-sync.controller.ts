import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiTenantIdHeader, TenantIdHeader, TransactionIdHeader } from '../../core/decorators';
import { NonEmptyBodyPipe } from '../../shared/pipes';
import { UuidUtility } from '../../shared/utilities';
import { SyncDiscrepancyCommand } from '../commands';
import { SyncDiscrepancyDtoInput } from '../dtos/inputs';

@ApiTenantIdHeader()
@ApiTags('Discrepancies')
@Controller('discrepancies')
export class DiscrepancySyncController {
    constructor(private readonly commandBus: CommandBus) {}

    @Post(':id/sync')
    @ApiParam({
        name: 'id',
        type: Number,
        required: true,
        description: 'The id of the discrepancy.',
    })
    @ApiOkResponse()
    @HttpCode(HttpStatus.OK)
    public async syncDiscrepancy(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: SyncDiscrepancyDtoInput,
    ): Promise<void> {
        await this.commandBus.execute<SyncDiscrepancyCommand, void>(
            new SyncDiscrepancyCommand(transactionId, tenantId, id, dtoInput.syncType),
        );
    }
}

import { Controller, Get, Param, Query, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiNotFoundResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { AccessGuard } from '../../access/guards';
import { ApiAccessKeyHeader, ApiTransactionIdHeader, TransactionIdHeader } from '../../core/decorators';
import { CustomersScopeInterceptor } from '../../customer/interceptors';
import { JumpointRetrievedDtoOutput } from '../../jumpoint/dtos/outputs';
import { MonitoringRequestPipe } from '../../monitoring/pipes';
import { UuidUtility } from '../../shared/utilities';
import { RetrieveSiteJumpointsDtoInput } from '../dtos/inputs';
import { SiteRequestPipe } from '../pipes';
import { RetrieveSiteJumpointsQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Sites')
@Controller('sites/:id/jumpoints')
@ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the site.' })
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor)
@UsePipes(MonitoringRequestPipe)
@UsePipes(SiteRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class SiteJumpointController {
    constructor(private readonly queryBus: QueryBus) {}

    @Get()
    @ApiOkResponse({
        type: JumpointRetrievedDtoOutput,
        isArray: true,
        description: 'Returns a list of jumpoints associated with the specified site.',
    })
    @ApiNotFoundResponse({ description: 'The specified site was not found.' })
    public async retrieveSiteJumpoints(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Query() dtoInput: RetrieveSiteJumpointsDtoInput,
    ) {
        const result = await this.queryBus.execute<RetrieveSiteJumpointsQuery, JumpointRetrievedDtoOutput[]>(
            new RetrieveSiteJumpointsQuery(transactionId, dtoInput.pageSize, dtoInput.pageNumber, id),
        );

        return result;
    }
}

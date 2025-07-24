import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiNotFoundResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiTransactionIdHeader, TransactionIdHeader } from '../../core/decorators';
import { JumpointRetrievedDtoOutput } from '../../jumpoint/dtos/outputs';
import { UuidUtility } from '../../shared/utilities';
import { RetrieveSiteJumpointsDtoInput } from '../dtos/inputs';
import { RetrieveSiteJumpointsQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiTags('Sites')
@Controller('sites/:id/jumpoints')
@ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the site.' })
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

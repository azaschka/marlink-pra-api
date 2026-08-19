import {
    Body,
    Controller,
    Query,
    QueryMethod,
    UseGuards,
    UseInterceptors,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AccessGuard } from '../../access/guards';
import {
    ApiAccessKeyHeader,
    ApiTenantIdHeader,
    ApiTransactionIdHeader,
    TenantIdHeader,
    TransactionIdHeader,
} from '../../core/decorators';
import { CustomersScopeInterceptor } from '../../customer/interceptors';
import { MonitoringRequestPipe } from '../../monitoring/pipes';
import { UuidUtility } from '../../shared/utilities';
import { PaginationDtoInput, RetrieveSocJumpItemsDtoInput, RetrieveSocJumpointsDtoInput } from '../dtos/inputs';
import { SocJumpItemRetrievedDtoOutput, SocJumpointRetrievedDtoOutput } from '../dtos/outputs';
import { SocJumpItem, SocJumpoint } from '../models';
import { SocRequestPipe } from '../pipes';
import { RetrieveSocJumpItemsQuery, RetrieveSocJumpointsQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Soc')
@Controller('soc')
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor)
@UsePipes(MonitoringRequestPipe)
@UsePipes(SocRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class SocController {
    constructor(private readonly queryBus: QueryBus) {}

    @QueryMethod('jump-items')
    @ApiOkResponse({ type: SocJumpItemRetrievedDtoOutput, isArray: true })
    public async retrieveSocJumpItems(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() query: PaginationDtoInput,
        @Body() body: RetrieveSocJumpItemsDtoInput,
    ): Promise<SocJumpItemRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveSocJumpItemsQuery, SocJumpItem[]>(
            new RetrieveSocJumpItemsQuery(
                transactionId,
                tenantId,
                query.pageSize,
                query.pageNumber,
                body.customerSiteInfo,
            ),
        );

        return result;
    }

    @QueryMethod('jumpoints')
    @ApiOkResponse({ type: SocJumpointRetrievedDtoOutput, isArray: true })
    public async retrieveSocJumpoints(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() query: PaginationDtoInput,
        @Body() body: RetrieveSocJumpointsDtoInput,
    ): Promise<SocJumpointRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveSocJumpointsQuery, SocJumpoint[]>(
            new RetrieveSocJumpointsQuery(
                transactionId,
                tenantId,
                query.pageSize,
                query.pageNumber,
                body.customerSiteInfo,
            ),
        );

        return result;
    }
}

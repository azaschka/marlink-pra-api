import { Controller, Get, Query, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
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
import { PaginationMetaDtoOutput } from '../../shared/dtos/outputs';
import { UuidUtility } from '../../shared/utilities';
import { SocScopeParam } from '../decorators';
import { SocFilterDtoInput } from '../dtos/inputs';
import { SocJumpItemsRetrievedDtoOutput, SocJumpointsRetrievedDtoOutput } from '../dtos/outputs';
import { SocJumpItem, SocJumpoint, SocPagedResult, SocScope } from '../models';
import { SocRequestPipe } from '../pipes';
import { RetrieveSocJumpItemsQuery, RetrieveSocJumpointsQuery } from '../queries';
import { SocScopeUtility } from '../utilities';

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

    @Get('jump-items')
    @ApiOkResponse({ type: SocJumpItemsRetrievedDtoOutput })
    public async retrieveSocJumpItems(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() query: SocFilterDtoInput,
        @SocScopeParam() scope: SocScope,
    ): Promise<SocJumpItemsRetrievedDtoOutput> {
        const result = await this.queryBus.execute<RetrieveSocJumpItemsQuery, SocPagedResult<SocJumpItem>>(
            new RetrieveSocJumpItemsQuery(
                transactionId,
                tenantId,
                query.pageSize,
                query.pageNumber,
                query.customerKey,
                query.siteKey,
                query.mappingStatus,
                SocScopeUtility.toScopedCustomerKeys(scope),
            ),
        );

        return {
            items: result.items,
            pagination: PaginationMetaDtoOutput.create(query.pageNumber, query.pageSize, result.totalCount),
        };
    }

    @Get('jumpoints')
    @ApiOkResponse({ type: SocJumpointsRetrievedDtoOutput })
    public async retrieveSocJumpoints(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() query: SocFilterDtoInput,
        @SocScopeParam() scope: SocScope,
    ): Promise<SocJumpointsRetrievedDtoOutput> {
        const result = await this.queryBus.execute<RetrieveSocJumpointsQuery, SocPagedResult<SocJumpoint>>(
            new RetrieveSocJumpointsQuery(
                transactionId,
                tenantId,
                query.pageSize,
                query.pageNumber,
                query.customerKey,
                query.siteKey,
                query.mappingStatus,
                SocScopeUtility.toScopedCustomerKeys(scope),
            ),
        );

        return {
            items: result.items,
            pagination: PaginationMetaDtoOutput.create(query.pageNumber, query.pageSize, result.totalCount),
        };
    }
}

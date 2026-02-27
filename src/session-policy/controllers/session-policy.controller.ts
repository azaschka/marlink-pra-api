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
import { UuidUtility } from '../../shared/utilities';
import { RetrieveSessionPoliciesDtoInput } from '../dtos/inputs';
import { SessionPolicyRetrievedDtoOutput } from '../dtos/outputs';
import { SessionPolicy } from '../models';
import { SessionPolicyRequestPipe } from '../pipes';
import { RetrieveSessionPoliciesQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiTags('Session Policies')
@ApiAccessKeyHeader()
@Controller('session-policies')
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor)
@UsePipes(MonitoringRequestPipe)
@UsePipes(SessionPolicyRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class SessionPolicyController {
    constructor(private readonly queryBus: QueryBus) {}

    @Get()
    @ApiOkResponse({ type: SessionPolicyRetrievedDtoOutput, isArray: true })
    public async retrieveSessionPolicies(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() dtoInput: RetrieveSessionPoliciesDtoInput,
    ): Promise<SessionPolicyRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveSessionPoliciesQuery, SessionPolicy[]>(
            new RetrieveSessionPoliciesQuery(
                transactionId,
                tenantId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.displayName,
                dtoInput.codeName,
                dtoInput.codeNamePatterns,
            ),
        );

        return result;
    }
}

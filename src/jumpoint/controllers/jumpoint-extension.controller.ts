import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Query,
    Res,
    UseGuards,
    UseInterceptors,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { AxiosResponse } from 'axios';
import { Response } from 'express';
import { AccessGuard } from '../../access/guards';
import {
    ApiAccessKeyHeader,
    ApiTenantIdHeader,
    ApiTransactionIdHeader,
    TenantIdHeader,
    TransactionIdHeader,
} from '../../core/decorators';
import { CustomersScopeInterceptor } from '../../customer/interceptors';
import { ErrorProcessorUtility, UuidUtility } from '../../shared/utilities';
import { RetrieveJumpointInstallerByCustomerAndSiteDtoInput } from '../dtos/inputs';
import { JumpointRequestPipe } from '../pipes';
import { RetrieveJumpointInstallerByCustomerAndSiteQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Jumpoints')
@Controller('jumpoints')
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor)
@UsePipes(JumpointRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class JumpointExtensionController {
    constructor(private readonly queryBus: QueryBus) {}

    @Get('installers')
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async retrieveJumpointInstallerByCustomerAndSite(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() dtoInput: RetrieveJumpointInstallerByCustomerAndSiteDtoInput,
        @Res() res: Response,
    ): Promise<void> {
        try {
            const response = await this.queryBus.execute<
                RetrieveJumpointInstallerByCustomerAndSiteQuery,
                AxiosResponse<NodeJS.ReadableStream>
            >(
                new RetrieveJumpointInstallerByCustomerAndSiteQuery(
                    transactionId,
                    tenantId,
                    dtoInput.businessUnit,
                    dtoInput.customerKey,
                    dtoInput.siteKey,
                ),
            );

            if (response.headers['content-type']) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                res.setHeader('Content-Type', response.headers['content-type']);
            }
            if (response.headers['content-disposition']) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                res.setHeader('Content-Disposition', response.headers['content-disposition']);
            }
            if (response.headers['content-length']) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                res.setHeader('Content-Length', response.headers['content-length']);
            }

            response.data.pipe(res);
        } catch (error) {
            if (error instanceof HttpException) {
                res.status(error.getStatus()).json({
                    statusCode: error.getStatus(),
                    message: error.message,
                });
            } else {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: ErrorProcessorUtility.stringify(error),
                });
            }
        }
    }
}

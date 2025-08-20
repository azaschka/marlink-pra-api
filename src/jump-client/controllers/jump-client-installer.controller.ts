import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Query,
    Res,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AxiosResponse } from 'axios';
import { Response } from 'express';
import { ApiTransactionIdHeader, TransactionIdHeader } from '../../core/decorators';
import { ErrorProcessorUtility, UuidUtility } from '../../shared/utilities';
import { CreateJumpClientInstallerCommand, DeleteJumpClientInstallerCommand } from '../commands';
import { CreateJumpClientInstallerDtoInput, RetrieveJumpClientInstallersDtoInput } from '../dtos/inputs';
import { JumpClientInstallerCreatedDtoOutput, JumpClientInstallerRetrievedDtoOutput } from '../dtos/outputs';
import { JumpClientInstallerPlatformType } from '../enums';
import { JumpClientInstaller } from '../models';
import { RetrieveJumpClientInstallerPlatformQuery, RetrieveJumpClientInstallersQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiTags('Jump Clients')
@Controller('jump-clients/installers')
@UsePipes(new ValidationPipe({ transform: true }))
export class JumpClientInstallerController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: JumpClientInstallerRetrievedDtoOutput, isArray: true })
    public async retrieveJumpClientInstallers(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Query() dtoInput: RetrieveJumpClientInstallersDtoInput,
    ): Promise<JumpClientInstallerRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveJumpClientInstallersQuery, JumpClientInstaller[]>(
            new RetrieveJumpClientInstallersQuery(
                transactionId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.name,
                dtoInput.hostname,
                dtoInput.fqdn,
                dtoInput.tag,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.connectionType,
            ),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({
        type: JumpClientInstallerCreatedDtoOutput,
        description:
            'Indicates the Jump Client installer was created successfully and contains the installer identifier and key information.',
    })
    @ApiConflictResponse({
        description: 'A Jump Client installer already exists.',
    })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async createJumpClientInstaller(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Body() dtoInput: CreateJumpClientInstallerDtoInput,
    ): Promise<JumpClientInstallerCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateJumpClientInstallerCommand, JumpClientInstaller>(
            new CreateJumpClientInstallerCommand(
                transactionId,
                dtoInput.jumpGroupId,
                dtoInput.name,
                dtoInput.jumpGroupType,
                dtoInput.jumpPolicyId,
                dtoInput.tag,
                dtoInput.connectionType,
                dtoInput.sessionPolicyId,
                dtoInput.comments,
                dtoInput.validDurationInMinutes,
                dtoInput.shouldElevateInstall,
                dtoInput.shouldElevatePrompt,
                dtoInput.canOverrideJumpGroup,
                dtoInput.canOverrideJumpPolicy,
                dtoInput.canOverrideName,
                dtoInput.canOverrideTag,
                dtoInput.canOverrideComments,
                dtoInput.canOverrideSessionPolicy,
                dtoInput.jumpointProxy,
            ),
        );

        return result;
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the Jump Client installer was successfully deleted.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async deleteJumpClientInstaller(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteJumpClientInstallerCommand, void>(
            new DeleteJumpClientInstallerCommand(transactionId, id),
        );
    }

    @Get(':installerId/platforms/:platformType')
    public async retrieveJumpClientInstallerPlatform(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('installerId') installerId: string,
        @Param('platformType') platformType: JumpClientInstallerPlatformType,
        @Res() res: Response,
    ): Promise<void> {
        try {
            const response = await this.queryBus.execute<
                RetrieveJumpClientInstallerPlatformQuery,
                AxiosResponse<NodeJS.ReadableStream>
            >(new RetrieveJumpClientInstallerPlatformQuery(transactionId, installerId, platformType));

            if (response.headers['content-type']) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                res.setHeader('Content-Type', response.headers['content-type']);
            }
            if (response.headers['content-disposition']) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                res.setHeader('Content-Disposition', response.headers['content-disposition']);
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

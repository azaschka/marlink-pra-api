import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiTransactionIdHeader, TransactionIdHeader } from '../../../core/decorators';
import { NonEmptyBodyPipe } from '../../../shared/pipes';
import { UuidUtility } from '../../../shared/utilities';
import {
    CopyRemoteVncCommand,
    CreateRemoteVncCommand,
    DeleteRemoteVncCommand,
    ModifyRemoteVncCommand,
} from '../commands';
import {
    CopyRemoteVncDtoInput,
    CreateRemoteVncDtoInput,
    ModifyRemoteVncDtoInput,
    RetrieveRemoteVncsDtoInput,
} from '../dtos/inputs';
import {
    RemoteVncCopiedDtoOutput,
    RemoteVncCreatedDtoOutput,
    RemoteVncModifiedDtoOutput,
    RemoteVncRetrievedDtoOutput,
} from '../dtos/outputs';
import { RemoteVnc } from '../models';
import { RetrieveRemoteVncsQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiTags('Jump Items')
@Controller('jump-items/remote-vncs')
@UsePipes(new ValidationPipe({ transform: true }))
export class RemoteVncController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: RemoteVncRetrievedDtoOutput, isArray: true })
    public async retrieveRemoteVncs(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Query() dtoInput: RetrieveRemoteVncsDtoInput,
    ): Promise<RemoteVncRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveRemoteVncsQuery, RemoteVncRetrievedDtoOutput[]>(
            new RetrieveRemoteVncsQuery(
                transactionId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.name,
                dtoInput.hostname,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.jumpointId,
                dtoInput.tag,
            ),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({ type: RemoteVncCreatedDtoOutput })
    public async createRemoteVnc(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Body() dtoInput: CreateRemoteVncDtoInput,
    ): Promise<RemoteVncCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateRemoteVncCommand, RemoteVnc>(
            new CreateRemoteVncCommand(
                transactionId,
                dtoInput.name,
                dtoInput.jumpointId,
                dtoInput.hostname,
                dtoInput.port,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.tag,
                dtoInput.comments,
                dtoInput.jumpPolicyId,
                dtoInput.sessionPolicyId,
            ),
        );

        return result;
    }

    @Patch(':id')
    @ApiOkResponse({ type: RemoteVncModifiedDtoOutput })
    public async modifyRemoteVnc(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyRemoteVncDtoInput,
    ): Promise<RemoteVncModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyRemoteVncCommand, RemoteVnc>(
            new ModifyRemoteVncCommand(
                transactionId,
                id,
                dtoInput.name,
                dtoInput.jumpointId,
                dtoInput.hostname,
                dtoInput.port,
                dtoInput.jumpGroupId,
                dtoInput.jumpGroupType,
                dtoInput.tag,
                dtoInput.comments,
                dtoInput.jumpPolicyId,
                dtoInput.sessionPolicyId,
            ),
        );

        return result;
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true })
    @HttpCode(HttpStatus.NO_CONTENT)
    public async deleteRemoteVnc(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteRemoteVncCommand, void>(new DeleteRemoteVncCommand(transactionId, id));
    }

    @Post(':id/copy')
    @ApiParam({ name: 'id', type: Number, required: true })
    @ApiOkResponse({ type: RemoteVncCopiedDtoOutput })
    @HttpCode(HttpStatus.OK)
    public async copyRemoteVnc(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body() dtoInput: CopyRemoteVncDtoInput,
    ): Promise<RemoteVncCopiedDtoOutput> {
        const result = await this.commandBus.execute<CopyRemoteVncCommand, RemoteVnc>(
            new CopyRemoteVncCommand(transactionId, id, dtoInput.jumpGroupId, dtoInput.jumpGroupType, dtoInput.name),
        );

        return result;
    }
}

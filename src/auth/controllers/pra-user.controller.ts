import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiExcludeController } from '@nestjs/swagger';
import { TransactionIdHeader } from '../../core/decorators';
import { UuidUtility } from '../../shared/utilities';
import { CreatePraUserCommand, DeletePraUserCommand, UpdatePraUserCommand } from '../commands';
import { RetrievePraUsersQuery } from '../queries';
import { CreatePraUserDtoInput, RetrievePraUsersDtoInput, UpdatePraUserDtoInput } from '../dtos/inputs';
import { ApiKeyAuthGuard, JwtAuthGuard } from '../guards';
import { PraUser } from '../models';

@Controller('pra-users')
@UseGuards(ApiKeyAuthGuard, JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
@ApiExcludeController()
export class PraUserController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    public async retrievePraUsers(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Query() dtoInput: RetrievePraUsersDtoInput,
    ): Promise<PraUser[]> {
        const result = await this.queryBus.execute<RetrievePraUsersQuery, PraUser[]>(
            new RetrievePraUsersQuery(
                transactionId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.id,
                dtoInput.username,
            ),
        );

        return result;
    }

    @Post()
    public async createPraUser(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Body() dtoInput: CreatePraUserDtoInput,
    ): Promise<PraUser> {
        const result = await this.commandBus.execute<CreatePraUserCommand, PraUser>(
            new CreatePraUserCommand(
                transactionId,
                dtoInput.username,
                dtoInput.password,
                dtoInput.email,
                dtoInput.role,
                dtoInput.displayName,
            ),
        );

        return result;
    }

    @Patch(':id')
    public async updatePraUser(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body() dtoInput: UpdatePraUserDtoInput,
    ): Promise<PraUser> {
        const result = await this.commandBus.execute<UpdatePraUserCommand, PraUser>(
            new UpdatePraUserCommand(
                transactionId,
                id,
                dtoInput.username,
                dtoInput.password,
                dtoInput.email,
                dtoInput.role,
                dtoInput.displayName,
            ),
        );

        return result;
    }

    @Delete(':id')
    public async deletePraUser(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeletePraUserCommand, void>(new DeletePraUserCommand(transactionId, id));
    }
}

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
import {
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiTransactionIdHeader, TransactionIdHeader } from '../../core/decorators';
import { NonEmptyBodyPipe } from '../../shared/pipes';
import { UuidUtility } from '../../shared/utilities';
import { CreateUserCommand, DeleteUserCommand, ModifyUserCommand } from '../commands';
import { CreateUserDtoInput, ModifyUserDtoInput, RetrieveUsersDtoInput } from '../dtos/inputs';
import { UserCreatedDtoOutput, UserModifiedDtoOutput, UserRetrievedDtoOutput } from '../dtos/outputs';
import { User } from '../models';
import { RetrieveUsersQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiTags('Users')
@Controller('users')
@UsePipes(new ValidationPipe({ transform: true }))
export class UserController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: UserRetrievedDtoOutput, isArray: true })
    public async retrieveUsers(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Query() dtoInput: RetrieveUsersDtoInput,
    ): Promise<UserRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveUsersQuery, User[]>(
            new RetrieveUsersQuery(
                transactionId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.securityProviderId,
                dtoInput.username,
                dtoInput.email,
            ),
        );

        return result;
    }

    @Post()
    @ApiCreatedResponse({
        type: UserCreatedDtoOutput,
        description: 'Indicates the user was created successfully and contains the new user instance.',
    })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async createUser(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Body() dtoInput: CreateUserDtoInput,
    ): Promise<UserCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateUserCommand, User>(
            new CreateUserCommand(
                transactionId,
                dtoInput.publicDisplayName,
                dtoInput.username,
                dtoInput.password,
                dtoInput.passwordExpirationDate,
                dtoInput.email,
                dtoInput.preferredEmailLanguage,
                dtoInput.isTwoFactorAuthRequired,
                dtoInput.isLoginAllowed,
                dtoInput.failedLoginAttempts,
                dtoInput.mustResetPasswordOnNextLogin,
            ),
        );

        return result;
    }

    @Patch(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({
        type: UserModifiedDtoOutput,
        description: 'Indicates the user was successfully updated and contains an updated user instance.',
    })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async modifyUser(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyUserDtoInput,
    ): Promise<UserModifiedDtoOutput> {
        const result = await this.commandBus.execute<ModifyUserCommand, User>(
            new ModifyUserCommand(
                transactionId,
                id,
                dtoInput.publicDisplayName,
                dtoInput.username,
                dtoInput.password,
                dtoInput.passwordExpirationDate,
                dtoInput.email,
                dtoInput.preferredEmailLanguage,
                dtoInput.isTwoFactorAuthRequired,
                dtoInput.isLoginAllowed,
                dtoInput.failedLoginAttempts,
                dtoInput.mustResetPasswordOnNextLogin,
                dtoInput.regeneratePassword,
            ),
        );

        return result;
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Indicates the user was successfully deleted.' })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    @ApiUnprocessableEntityResponse({
        description:
            'One or more request parameters are invalid. The body contains a general error message as well as a validation error dictionary.',
    })
    public async deleteUser(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute<DeleteUserCommand, void>(new DeleteUserCommand(transactionId, id));
    }
}

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
    UseGuards,
    UseInterceptors,
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
import { AccessGuard } from '../../access/guards';
import { AppConfigService } from '../../app-config/services/app-config.service';
import {
    ApiAccessKeyHeader,
    ApiTenantIdHeader,
    ApiTransactionIdHeader,
    TenantIdHeader,
    TransactionIdHeader,
} from '../../core/decorators';
import { CustomersScopeInterceptor } from '../../customer/interceptors';
import { MonitoringRequestPipe } from '../../monitoring/pipes';
import { NonEmptyBodyPipe } from '../../shared/pipes';
import { UuidUtility } from '../../shared/utilities';
import { CreateUserCommand, DeleteUserCommand, ModifyUserCommand } from '../commands';
import { CreateUserDtoInput, ModifyUserDtoInput, RetrieveUsersDtoInput } from '../dtos/inputs';
import { UserCreatedDtoOutput, UserModifiedDtoOutput, UserRetrievedDtoOutput } from '../dtos/outputs';
import { UserSourceType } from '../enums';
import { NonLocalUserDeletionException, NonLocalUserModificationException } from '../exceptions';
import { User } from '../models';
import { UserSourceUtility } from '../utilities';
import { UserRequestPipe } from '../pipes';
import { RetrieveUserByIdQuery, RetrieveUsersQuery } from '../queries';

@ApiTenantIdHeader()
@ApiTransactionIdHeader()
@ApiAccessKeyHeader()
@ApiTags('Users')
@Controller('users')
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor)
@UsePipes(UserRequestPipe)
@UsePipes(MonitoringRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class UserController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly appConfigService: AppConfigService,
    ) {}

    private async loadUser(transactionId: string, tenantId: number, id: number): Promise<User> {
        return await this.queryBus.execute<RetrieveUserByIdQuery, User>(
            new RetrieveUserByIdQuery(transactionId, tenantId, id),
        );
    }

    private isExternalUser(user: User): boolean {
        return (
            UserSourceUtility.resolveSourceType(user, this.appConfigService.user.localSecurityProviderIds) ===
            UserSourceType.External
        );
    }

    /**
     * R3.2-A004: local-only properties that the request would actually change.
     *
     * BeyondTrust only accepts these on local accounts, and forwarding them for a non-local user produces an
     * opaque upstream error. What counts is whether the request changes them, not whether it mentions them:
     * the console sends the whole edit form every time, so username arrives on every update and
     * regeneratePassword arrives as false. Rejecting an unchanged value or a flag that is switched off would
     * make a non-local user uneditable for no reason, including the display name and email that BeyondTrust
     * itself decides on.
     */
    private findRejectedLocalOnlyProperties(dtoInput: ModifyUserDtoInput, user: User): string[] {
        const rejectedProperties: string[] = [];

        if (dtoInput.username !== undefined && dtoInput.username !== user.username) {
            rejectedProperties.push('username');
        }

        if (dtoInput.password !== undefined) {
            rejectedProperties.push('password');
        }

        if (dtoInput.passwordExpirationDate !== undefined) {
            rejectedProperties.push('passwordExpirationDate');
        }

        if (dtoInput.failedLoginAttempts !== undefined && dtoInput.failedLoginAttempts !== user.failedLoginAttempts) {
            rejectedProperties.push('failedLoginAttempts');
        }

        if (dtoInput.mustResetPasswordOnNextLogin) {
            rejectedProperties.push('mustResetPasswordOnNextLogin');
        }

        if (dtoInput.regeneratePassword) {
            rejectedProperties.push('regeneratePassword');
        }

        return rejectedProperties;
    }

    @Get(':id')
    @ApiParam({ name: 'id', type: Number, required: true, description: 'Unique identifier for the resource.' })
    @ApiOkResponse({ type: UserRetrievedDtoOutput })
    @ApiNotFoundResponse({ description: 'The specified resource was not found.' })
    public async retrieveUser(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<UserRetrievedDtoOutput> {
        const result = await this.queryBus.execute<RetrieveUserByIdQuery, User>(
            new RetrieveUserByIdQuery(transactionId, tenantId, id),
        );

        return UserRetrievedDtoOutput.create(result, this.appConfigService.user.localSecurityProviderIds);
    }

    @Get()
    @ApiOkResponse({ type: UserRetrievedDtoOutput, isArray: true })
    public async retrieveUsers(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() dtoInput: RetrieveUsersDtoInput,
    ): Promise<UserRetrievedDtoOutput[]> {
        const result = await this.queryBus.execute<RetrieveUsersQuery, User[]>(
            new RetrieveUsersQuery(
                transactionId,
                tenantId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.securityProviderId,
                dtoInput.username,
                dtoInput.email,
                dtoInput.publicDisplayNamePatterns,
            ),
        );

        return result.map((user) =>
            UserRetrievedDtoOutput.create(user, this.appConfigService.user.localSecurityProviderIds),
        );
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
        @TenantIdHeader() tenantId: number,
        @Body() dtoInput: CreateUserDtoInput,
    ): Promise<UserCreatedDtoOutput> {
        const result = await this.commandBus.execute<CreateUserCommand, User>(
            new CreateUserCommand(
                transactionId,
                tenantId,
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
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyUserDtoInput,
    ): Promise<UserModifiedDtoOutput> {
        const userToModify = await this.loadUser(transactionId, tenantId, id);

        if (this.isExternalUser(userToModify)) {
            const rejectedProperties = this.findRejectedLocalOnlyProperties(dtoInput, userToModify);

            if (rejectedProperties.length > 0) {
                throw new NonLocalUserModificationException(rejectedProperties);
            }
        }

        const result = await this.commandBus.execute<ModifyUserCommand, User>(
            new ModifyUserCommand(
                transactionId,
                tenantId,
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
                dtoInput.mustResetPasswordOnNextLogin || dtoInput.regeneratePassword,
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
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
    ): Promise<void> {
        if (this.isExternalUser(await this.loadUser(transactionId, tenantId, id))) {
            throw new NonLocalUserDeletionException(id);
        }

        await this.commandBus.execute<DeleteUserCommand, void>(new DeleteUserCommand(transactionId, tenantId, id));
    }
}

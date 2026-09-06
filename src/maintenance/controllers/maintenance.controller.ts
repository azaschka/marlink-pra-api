import {
    BadRequestException,
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyAuthGuard, JwtAuthGuard } from '../../auth/guards';
import { JWTUser } from '../../auth/models';
import { TransactionIdHeader } from '../../core/decorators';
import { UuidUtility } from '../../shared/utilities';
import { ResetDataDtoInput } from '../dtos/inputs';
import { ResetAuthorizationGuard } from '../guards';
import { ResetDataResult } from '../models';
import { DatabaseResetService } from '../services/database-reset.service';

@Controller('maintenance')
@UseGuards(ApiKeyAuthGuard, JwtAuthGuard, ResetAuthorizationGuard)
@UsePipes(new ValidationPipe({ transform: true }))
@ApiExcludeController()
export class MaintenanceController {
    private static readonly RESET_CONFIRMATION_PHRASE = 'RESET-DATA';

    constructor(private readonly databaseResetService: DatabaseResetService) {}

    @Post('reset-data')
    @HttpCode(HttpStatus.OK)
    public async resetData(
        @Req() request: Request,
        @Body() dtoInput: ResetDataDtoInput,
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
    ): Promise<ResetDataResult> {
        if (dtoInput.dryRun) {
            return this.databaseResetService.previewReset();
        }

        if (dtoInput.confirm !== MaintenanceController.RESET_CONFIRMATION_PHRASE) {
            throw new BadRequestException(
                `Confirmation failed. Provide { "confirm": "${MaintenanceController.RESET_CONFIRMATION_PHRASE}" } to execute the reset.`,
            );
        }

        const user = request.user as JWTUser;

        return this.databaseResetService.executeReset(user.username, transactionId);
    }
}

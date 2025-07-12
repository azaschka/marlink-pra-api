import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { BusinessUnit } from '../../customer/enums';
import { CreateJumpointCommand } from '../../jumpoint/commands';
import { JumpointPlatformType } from '../../jumpoint/enums';
import { Jumpoint } from '../../jumpoint/models';
import { RetrieveJumpointsQuery } from '../../jumpoint/queries';
import { BaseWorkflow } from '../../shared/workflows';

export class JumpointsWorkflow implements BaseWorkflow<Jumpoint[]> {
    private getJumpointName(jumpointNumber: number): string {
        return `${this.customerBusinessUnit}_${this.appConfigService.site.jumpoint.prefix}${jumpointNumber}_${this.customerName.toUpperCase()}_${this.siteName.toUpperCase()}_${this.siteKey.toUpperCase()}`;
    }

    private getJumpointCodeName(jumpointNumber: number): string {
        return this.getJumpointName(jumpointNumber).toLowerCase();
    }

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly totalJumpoints: number,
        private readonly siteName: string,
        private readonly siteKey: string,
        private readonly customerName: string,
        private readonly customerBusinessUnit: BusinessUnit,
    ) {}

    public async getOrCreate(): Promise<Jumpoint[]> {
        const jumpoints: Jumpoint[] = [];

        for (let i = 1; i <= this.totalJumpoints; i++) {
            const existingJumpoints = await this.queryBus.execute<RetrieveJumpointsQuery, Jumpoint[]>(
                new RetrieveJumpointsQuery(this.transactionId, 1, 1, this.getJumpointName(i)),
            );

            if (existingJumpoints.length > 0 && existingJumpoints[0]) {
                jumpoints.push(existingJumpoints[0]);
                continue;
            }

            const createdJumpoint = await this.commandBus.execute<CreateJumpointCommand, Jumpoint>(
                new CreateJumpointCommand(
                    this.transactionId,
                    this.getJumpointName(i),
                    JumpointPlatformType.LinuxX86,
                    this.getJumpointCodeName(i),
                    undefined,
                    undefined,
                    undefined,
                    true, // isShellJumpEnabled
                ),
            );

            jumpoints.push(createdJumpoint);
        }

        return jumpoints;
    }
}

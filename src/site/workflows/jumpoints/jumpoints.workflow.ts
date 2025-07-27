import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { BusinessUnit } from '../../../customer/enums';
import { CreateJumpointCommand, DeleteJumpointCommand, ModifyJumpointCommand } from '../../../jumpoint/commands';
import { JumpointPlatformType } from '../../../jumpoint/enums';
import { Jumpoint } from '../../../jumpoint/models';
import { RetrieveJumpointsQuery } from '../../../jumpoint/queries';
import { BaseWorkflow } from '../../../shared/workflows';

export class JumpointsWorkflow implements BaseWorkflow<Jumpoint[]> {
    private static readonly PLATFORM_TYPE = JumpointPlatformType.LinuxX86;
    private static readonly COMMENTS = '';
    private static readonly IS_ENABLED = true;
    private static readonly IS_CLUSTERED = false;
    private static readonly IS_SHELL_JUMP_ENABLED = true;
    private static readonly EXTERNAL_JUMP_ITEM_NETWORK_ID = undefined;
    private static readonly IS_PROTOCOL_TUNNEL_ENABLED = true;
    private static readonly RDP_SERVICE_ACCOUNT_ID = null;
    private static readonly TOTAL_JUMPOINTS = 1;

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
        private readonly siteName: string,
        private readonly siteKey: string,
        private readonly customerName: string,
        private readonly customerBusinessUnit: BusinessUnit,
    ) {}

    public async getOrCreate(): Promise<Jumpoint[]> {
        const jumpoints: Jumpoint[] = [];

        for (let i = 1; i <= JumpointsWorkflow.TOTAL_JUMPOINTS; i++) {
            const jumpoint = await this.getOrModify(i);

            if (jumpoint) {
                jumpoints.push(jumpoint);
                continue;
            }

            const createdJumpoint = await this.commandBus.execute<CreateJumpointCommand, Jumpoint>(
                new CreateJumpointCommand(
                    this.transactionId,
                    this.getJumpointName(i), // name
                    JumpointsWorkflow.PLATFORM_TYPE, // platformType
                    this.getJumpointCodeName(i), // codeName
                    JumpointsWorkflow.COMMENTS, // comments
                    JumpointsWorkflow.IS_ENABLED, // isEnabled
                    JumpointsWorkflow.IS_CLUSTERED, // isClustered
                    JumpointsWorkflow.IS_SHELL_JUMP_ENABLED, // isShellJumpEnabled
                    JumpointsWorkflow.EXTERNAL_JUMP_ITEM_NETWORK_ID, // externalJumpItemNetworkId
                    JumpointsWorkflow.IS_PROTOCOL_TUNNEL_ENABLED, // isProtocolTunnelEnabled
                    JumpointsWorkflow.RDP_SERVICE_ACCOUNT_ID, // rdpServiceAccountId
                ),
            );

            jumpoints.push(createdJumpoint);
        }

        return jumpoints;
    }

    public async delete(): Promise<void> {
        for (let i = 1; i <= JumpointsWorkflow.TOTAL_JUMPOINTS; i++) {
            const jumpoint = await this.get(i);

            if (!jumpoint) {
                continue;
            }

            await this.commandBus.execute<DeleteJumpointCommand, void>(
                new DeleteJumpointCommand(this.transactionId, jumpoint.id),
            );
        }
    }

    private async getOrModify(jumpointNumber: number): Promise<Jumpoint | null> {
        const jumpoint = await this.get(jumpointNumber);

        if (!jumpoint) {
            return null;
        }

        if (jumpoint.isShellJumpEnabled !== JumpointsWorkflow.IS_SHELL_JUMP_ENABLED) {
            return await this.commandBus.execute<ModifyJumpointCommand, Jumpoint>(
                new ModifyJumpointCommand(
                    this.transactionId,
                    jumpoint.id,
                    undefined, // name
                    undefined, // codeName
                    undefined, // comments
                    undefined, // isEnabled
                    JumpointsWorkflow.IS_SHELL_JUMP_ENABLED, // isShellJumpEnabled
                ),
            );
        }

        return jumpoint;
    }

    private async get(jumpointNumber: number): Promise<Jumpoint | null> {
        const jumpoints = await this.queryBus.execute<RetrieveJumpointsQuery, Jumpoint[]>(
            new RetrieveJumpointsQuery(
                this.transactionId,
                1,
                1,
                this.getJumpointName(jumpointNumber),
                undefined,
                undefined,
                undefined,
                this.getJumpointCodeName(jumpointNumber),
            ),
        );

        return jumpoints[0] ?? null;
    }
}

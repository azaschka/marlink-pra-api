import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateJumpGroupCommand, DeleteJumpGroupCommand } from '../../../jump-group/commands';
import { JumpGroup } from '../../../jump-group/models';
import { RetrieveJumpGroupsQuery } from '../../../jump-group/queries';
import { BaseWorkflow } from '../../../shared/workflows';
import { PartialSiteSupportTeamMember } from '../../models';

export class SupportTeamJumpGroupWorkflow implements BaseWorkflow<JumpGroup> {
    private get jumpGroupName(): string {
        return `${this.customerName.toUpperCase()}_${this.siteSupportTeamMember.supportTeamName.toUpperCase()}`;
    }

    private get jumpGroupCodeName(): string {
        return this.jumpGroupName.toLowerCase();
    }

    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteSupportTeamMember: PartialSiteSupportTeamMember,
        private readonly customerName: string,
    ) {}

    public async getOrCreate(): Promise<JumpGroup> {
        const jumpGroup = await this.get();

        if (jumpGroup) {
            return jumpGroup;
        }

        return await this.commandBus.execute<CreateJumpGroupCommand, JumpGroup>(
            new CreateJumpGroupCommand(
                this.transactionId,
                this.jumpGroupName,
                this.jumpGroupCodeName,
                this.siteSupportTeamMember.supportTeamTrustLevel,
            ),
        );
    }

    public async delete(): Promise<void> {
        const jumpGroup = await this.get();

        if (!jumpGroup) {
            return;
        }

        await this.commandBus.execute<DeleteJumpGroupCommand, void>(
            new DeleteJumpGroupCommand(this.transactionId, jumpGroup.id),
        );
    }

    private async get(): Promise<JumpGroup | null> {
        const jumpGroups = await this.queryBus.execute<RetrieveJumpGroupsQuery, JumpGroup[]>(
            new RetrieveJumpGroupsQuery(this.transactionId, 1, 1, this.jumpGroupName),
        );

        return jumpGroups[0] ?? null;
    }
}

import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { BaseWorkflow } from '../../shared/workflows';
import { CreateTeamCommand, DeleteTeamCommand } from '../../team/commands';
import { Team } from '../../team/models';
import { RetrieveTeamsQuery } from '../../team/queries';

export class TeamWorkflow implements BaseWorkflow<Team> {
    private get teamName(): string {
        return `${this.customerName.toUpperCase()}_${this.siteName.toUpperCase()}_${this.siteKey.toUpperCase()}`;
    }

    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteName: string,
        private readonly siteKey: string,
        private readonly customerName: string,
    ) {}

    public async getOrCreate(): Promise<Team> {
        const team = await this.get();

        if (team) {
            return team;
        }

        return await this.commandBus.execute<CreateTeamCommand, Team>(
            new CreateTeamCommand(this.transactionId, this.teamName),
        );
    }

    public async delete(): Promise<void> {
        const team = await this.get();

        if (!team) {
            return;
        }

        await this.commandBus.execute<DeleteTeamCommand, void>(new DeleteTeamCommand(this.transactionId, team.id));
    }

    private async get(): Promise<Team | null> {
        const teams = await this.queryBus.execute<RetrieveTeamsQuery, Team[]>(
            new RetrieveTeamsQuery(this.transactionId, 1, 1, this.teamName),
        );

        return teams[0] ?? null;
    }
}

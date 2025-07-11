import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { BaseWorkflow } from '../../shared/workflows';
import { CreateTeamCommand } from '../../team/commands';
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
        const teams = await this.queryBus.execute<RetrieveTeamsQuery, Team[]>(
            new RetrieveTeamsQuery(this.transactionId, 1, 1, this.teamName),
        );

        if (teams.length > 0 && teams[0]) {
            return teams[0];
        }

        return await this.commandBus.execute<CreateTeamCommand, Team>(
            new CreateTeamCommand(this.transactionId, this.teamName),
        );
    }
}

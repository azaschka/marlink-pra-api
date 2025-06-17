import { Controller } from '@nestjs/common';
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';

@Controller()
export class AppController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
    ) {
        this.commandBus.subscribe((command) => {
            console.log(`\x1b[34mCommand received:\n${JSON.stringify(command, null, 2)}\x1b[0m`);
        });

        this.queryBus.subscribe((query) => {
            console.log(`\x1b[35mQuery received:\n${JSON.stringify(query, null, 2)}\x1b[0m`);
        });

        this.eventBus.subscribe((event) => {
            console.log(`\x1b[32mEvent received:\n${JSON.stringify(event, null, 2)}\x1b[0m`);
        });
    }
}

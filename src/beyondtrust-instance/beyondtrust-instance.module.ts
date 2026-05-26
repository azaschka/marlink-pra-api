import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { BeyondtrustInstanceController } from './controllers/beyondtrust-instance.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [BeyondtrustInstanceController],
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class BeyondtrustInstanceModule {}

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { BeyondtrustInstanceBackupController } from './controllers/beyondtrust-instance-backup.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [BeyondtrustInstanceBackupController],
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class BeyondtrustInstanceBackupModule {}

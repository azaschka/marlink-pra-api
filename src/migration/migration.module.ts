import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../app-config/app-config.module';
import { MigrationService } from './services/migration.service';

@Module({
    imports: [TypeOrmModule.forFeature(), AppConfigModule],
    providers: [MigrationService],
})
export class MigrationModule implements OnModuleInit {
    constructor(private readonly migrationService: MigrationService) {}

    public async onModuleInit(): Promise<void> {
        // Run migrations on application startup

        await this.migrationService.runMigrations();
    }
}

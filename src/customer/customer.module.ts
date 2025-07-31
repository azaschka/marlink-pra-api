import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { CustomerController } from './controllers/customer.controller';
import { QueryHandlers } from './queries/handlers';
import { CustomerEntity } from './repositories/entities';
import { CustomerRepositoryService } from './repositories/services/customer-repository.service';
import { CustomerSaga } from './sagas';

@Module({
    imports: [TypeOrmModule.forFeature([CustomerEntity]), AppConfigModule],
    controllers: [CustomerController],
    providers: [...QueryHandlers, ...CommandHandlers, CustomerRepositoryService, CustomerSaga],
})
export class CustomerModule {}

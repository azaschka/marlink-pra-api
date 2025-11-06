import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessGuard } from '../access/guards';
import { BusinessUnitsScopeInterceptor } from '../access/interceptors';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { CustomerController } from './controllers/customer.controller';
import { CustomerRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';
import { CustomerEntity } from './repositories/entities';
import { CustomerRepositoryService } from './repositories/services/customer-repository.service';
import { CustomerSaga } from './sagas';

@Module({
    imports: [TypeOrmModule.forFeature([CustomerEntity]), AppConfigModule],
    controllers: [CustomerController],
    providers: [
        AccessGuard,
        BusinessUnitsScopeInterceptor,
        CustomerRequestPipe,
        ...QueryHandlers,
        ...CommandHandlers,
        CustomerRepositoryService,
        CustomerSaga,
    ],
})
export class CustomerModule {}

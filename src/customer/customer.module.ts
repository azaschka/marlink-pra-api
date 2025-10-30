import { Module, Scope } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessGuard } from '../access/guards';
import { BusinessUnitsScopeInterceptor } from '../access/interceptors';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { CustomerController } from './controllers/customer.controller';
import { CustomerRequestTransformerPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';
import { CustomerEntity } from './repositories/entities';
import { CustomerRepositoryService } from './repositories/services/customer-repository.service';
import { CustomerSaga } from './sagas';

@Module({
    imports: [TypeOrmModule.forFeature([CustomerEntity]), AppConfigModule],
    controllers: [CustomerController],
    providers: [
        {
            provide: APP_GUARD,
            useClass: AccessGuard,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: BusinessUnitsScopeInterceptor,
        },
        {
            provide: APP_PIPE,
            scope: Scope.REQUEST,
            useClass: CustomerRequestTransformerPipe,
        },
        ...QueryHandlers,
        ...CommandHandlers,
        CustomerRepositoryService,
        CustomerSaga,
    ],
})
export class CustomerModule {}

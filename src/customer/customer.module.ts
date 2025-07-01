import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandHandlers } from './commands/handlers';
import { CustomerController } from './controllers/customer.controller';
import { QueryHandlers } from './queries/handlers';
import { CustomerEntity } from './repositories/entities';
import { CustomerRepositoryService } from './repositories/services/customer-repository.service';

@Module({
    imports: [TypeOrmModule.forFeature([CustomerEntity])],
    controllers: [CustomerController],
    providers: [...QueryHandlers, ...CommandHandlers, CustomerRepositoryService],
})
export class CustomerModule {}

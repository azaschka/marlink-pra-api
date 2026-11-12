# Adding a New Module Guide

This guide provides step-by-step instructions for adding a new domain module to the PRA API following established patterns and conventions.

## Prerequisites

Before creating a new module, ensure you understand:

- **[CQRS Pattern](../architecture/CQRS_IMPLEMENTATION.md)** - Command/Query separation
- **[Access Control Flow](../architecture/MODULE_DEPENDENCIES.md)** - Multi-layered security (AccessGuard, scope interceptors, request pipes)
- **[Module Structure](../architecture/MODULE_DEPENDENCIES.md)** - Standard module organization
- Review existing modules (e.g., `src/customer/`, `src/user/`) as references

## Step 1: Define Module Requirements

Answer these questions before starting:

### 1.1 What is the module's purpose?

- [ ] Domain entity management (e.g., customers, sites, users)
- [ ] External API integration (e.g., BeyondTrust sync)
- [ ] Support service (e.g., email, monitoring)

### 1.2 What data storage pattern?

- [ ] **Database only** - TypeORM entities (e.g., Customer, Site)
- [ ] **External API only** - HTTP calls (e.g., User, Team, Jump Group)
- [ ] **Hybrid** - Both database and external API

### 1.3 What scoping pattern?

- [ ] **Business Unit scoped** - Access controlled by business units (only CustomerModule)
- [ ] **Customer scoped** - Access controlled by customer names (most modules)
- [ ] **Jump Group scoped** - Access controlled by jump group IDs (jump items, jump clients)
- [ ] **No scoping** - Admin-only endpoints (health, auth, BeyondTrust instances)

### 1.4 What operations are needed?

- [ ] Create (POST)
- [ ] Retrieve/List (GET)
- [ ] Modify (PATCH)
- [ ] Delete (DELETE)
- [ ] Custom operations (e.g., activate/deactivate)

## Step 2: Create Module Structure

Create the following directory structure:

```bash
src/
└── entity-name/
    ├── entity-name.module.ts         # NestJS module
    ├── commands/
    │   ├── index.ts                  # Export all commands
    │   ├── create-entity.command.ts
    │   ├── modify-entity.command.ts
    │   ├── delete-entity.command.ts
    │   └── handlers/
    │       ├── index.ts              # Export CommandHandlers array
    │       ├── create-entity.command-handler.ts
    │       ├── modify-entity.command-handler.ts
    │       └── delete-entity.command-handler.ts
    ├── queries/
    │   ├── index.ts                  # Export all queries
    │   ├── retrieve-entities.query.ts
    │   ├── retrieve-entity-by-id.query.ts
    │   └── handlers/
    │       ├── index.ts              # Export QueryHandlers array
    │       ├── retrieve-entities.query-handler.ts
    │       └── retrieve-entity-by-id.query-handler.ts
    ├── controllers/
    │   └── entity.controller.ts      # HTTP endpoints
    ├── models/
    │   └── entity.model.ts           # Domain interface
    ├── dtos/
    │   ├── inputs/
    │   │   ├── index.ts
    │   │   ├── create-entity.dto-input.ts
    │   │   ├── modify-entity.dto-input.ts
    │   │   └── retrieve-entities.dto-input.ts
    │   └── outputs/
    │       ├── index.ts
    │       ├── entity-created.dto-output.ts
    │       ├── entity-modified.dto-output.ts
    │       └── entity-retrieved.dto-output.ts
    ├── pipes/
    │   ├── index.ts
    │   └── entity-request.pipe.ts    # Scope validation
    ├── events/                       # Optional - if events needed
    │   ├── index.ts
    │   ├── entity-created.event.ts
    │   └── entity-modified.event.ts
    ├── sagas/                        # Optional - if workflows needed
    │   └── index.ts
    ├── workflows/                    # Optional - complex processes
    │   └── entity-workflow.ts
    └── repositories/                 # Only if database storage
        ├── entities/
        │   ├── index.ts
        │   └── entity.entity.ts      # TypeORM entity
        └── services/
            ├── index.ts
            └── entity-repository.service.ts
```

## Step 3: Create Domain Model

Define the domain interface that represents your entity.

**File**: `src/entity-name/models/entity.model.ts`

```typescript
export interface Entity {
    id: number;
    name: string;
    // ... other properties
    creationDate: Date;
    lastModificationDate?: Date;
}
```

## Step 4: Create Database Entity (If Needed)

If storing data in the database, create TypeORM entity.

**File**: `src/entity-name/repositories/entities/entity.entity.ts`

```typescript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Entity as EntityModel } from '../../models';

@Entity({ name: 'pra_entities' })
export class EntityEntity implements EntityModel {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @Column({ name: 'name', type: 'varchar', unique: true })
    public name!: string;

    // Add more columns with snake_case names

    @CreateDateColumn({ name: 'creation_date', type: 'timestamp' })
    public creationDate!: Date;

    @UpdateDateColumn({ name: 'last_modification_date', type: 'timestamp', nullable: true })
    public lastModificationDate?: Date;

    // Static factory methods
    public static create(id: number, name: string, ...): EntityEntity {
        const entity = new EntityEntity();
        entity.id = id;
        entity.name = name;
        // ... set other properties
        return entity;
    }

    public static createWithoutId(name: string, ...): EntityEntity {
        const entity = new EntityEntity();
        entity.name = name;
        // ... set other properties
        return entity;
    }
}
```

**Conventions**:

- Table name: `pra_{plural_entity_name}` (e.g., `pra_entities`)
- Column names: `snake_case` in database, `camelCase` in TypeScript
- Always include `creation_date` and `last_modification_date`
- Provide static factory methods `create()` and `createWithoutId()`

## Step 5: Create Repository Service (If Needed)

**File**: `src/entity-name/repositories/services/entity-repository.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entity } from '../../models';
import { EntityEntity } from '../entities';

@Injectable()
export class EntityRepositoryService {
    constructor(
        @InjectRepository(EntityEntity)
        private readonly repository: Repository<EntityEntity>,
    ) {}

    public async create(entity: EntityEntity): Promise<Entity> {
        return await this.repository.save(entity);
    }

    public async findOneById(id: number): Promise<Entity | null> {
        return await this.repository.findOne({ where: { id } });
    }

    public async findAll(): Promise<Entity[]> {
        return await this.repository.find();
    }

    public async update(id: number, updates: Partial<EntityEntity>): Promise<void> {
        await this.repository.update(id, updates);
    }

    public async delete(id: number): Promise<void> {
        await this.repository.delete(id);
    }
}
```

## Step 6: Create Commands

### 6.1 Define Command Classes

**File**: `src/entity-name/commands/create-entity.command.ts`

```typescript
export class CreateEntityCommand {
    constructor(
        public readonly transactionId: string,
        public readonly name: string,
        // ... other properties
    ) {}
}
```

**File**: `src/entity-name/commands/modify-entity.command.ts`

```typescript
export class ModifyEntityCommand {
    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly name?: string,
        // ... other optional properties
    ) {}
}
```

**File**: `src/entity-name/commands/delete-entity.command.ts`

```typescript
export class DeleteEntityCommand {
    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
```

### 6.2 Create Command Handlers

**File**: `src/entity-name/commands/handlers/create-entity.command-handler.ts`

```typescript
import { CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { EntityRepositoryService } from '../../repositories/services';
import { EntityEntity } from '../../repositories/entities';
import { Entity } from '../../models';
import { EntityCreatedEvent } from '../../events';
import { CreateEntityCommand } from '../create-entity.command';

@CommandHandler(CreateEntityCommand)
export class CreateEntityCommandHandler implements ICommandHandler<CreateEntityCommand> {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly repositoryService: EntityRepositoryService,
    ) {}

    public async execute(command: CreateEntityCommand): Promise<Entity> {
        // 1. Validate (using queries)
        await this.validateInputs(command);

        // 2. Create entity
        const entity = EntityEntity.createWithoutId(command.name, ...);
        const created = await this.repositoryService.create(entity);

        // 3. Emit event
        this.eventBus.publish(
            new EntityCreatedEvent(command.transactionId, {
                entity: created,
            })
        );

        // 4. Return result
        return created;
    }

    private async validateInputs(command: CreateEntityCommand): Promise<void> {
        // Add validation logic (e.g., check uniqueness)
    }
}
```

### 6.3 Export Handlers

**File**: `src/entity-name/commands/handlers/index.ts`

```typescript
import { CreateEntityCommandHandler } from './create-entity.command-handler';
import { ModifyEntityCommandHandler } from './modify-entity.command-handler';
import { DeleteEntityCommandHandler } from './delete-entity.command-handler';

export const CommandHandlers = [CreateEntityCommandHandler, ModifyEntityCommandHandler, DeleteEntityCommandHandler];
```

## Step 7: Create Queries

### 7.1 Define Query Classes

**File**: `src/entity-name/queries/retrieve-entities.query.ts`

```typescript
export class RetrieveEntitiesQuery {
    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly namePat?: string,
        // ... other filter parameters
    ) {}
}
```

**File**: `src/entity-name/queries/retrieve-entity-by-id.query.ts`

```typescript
export class RetrieveEntityByIdQuery {
    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
```

### 7.2 Create Query Handlers

**File**: `src/entity-name/queries/handlers/retrieve-entities.query-handler.ts`

```typescript
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EntityRepositoryService } from '../../repositories/services';
import { Entity } from '../../models';
import { RetrieveEntitiesQuery } from '../retrieve-entities.query';

@QueryHandler(RetrieveEntitiesQuery)
export class RetrieveEntitiesQueryHandler implements IQueryHandler<RetrieveEntitiesQuery> {
    constructor(private readonly repositoryService: EntityRepositoryService) {}

    public async execute(query: RetrieveEntitiesQuery): Promise<Entity[]> {
        // Implement query logic
        return await this.repositoryService.findAll();
    }
}
```

### 7.3 Export Handlers

**File**: `src/entity-name/queries/handlers/index.ts`

```typescript
import { RetrieveEntitiesQueryHandler } from './retrieve-entities.query-handler';
import { RetrieveEntityByIdQueryHandler } from './retrieve-entity-by-id.query-handler';

export const QueryHandlers = [RetrieveEntitiesQueryHandler, RetrieveEntityByIdQueryHandler];
```

## Step 8: Create Controller

**File**: `src/entity-name/controllers/entity.controller.ts`

```typescript
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
    UseInterceptors,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
    ApiCreatedResponse,
    ApiOkResponse,
    ApiNoContentResponse,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { AccessGuard } from '../../access/guards';
import { CustomersScopeInterceptor } from '../../customer/interceptors';
import { ApiAccessKeyHeader, ApiTenantIdHeader, ApiTransactionIdHeader, TransactionIdHeader, TenantIdHeader } from '../../core/decorators';
import { MonitoringRequestPipe } from '../../monitoring/pipes';
import { NonEmptyBodyPipe } from '../../shared/pipes';
import { UuidUtility } from '../../shared/utilities';
import {
    CreateEntityCommand,
    ModifyEntityCommand,
    DeleteEntityCommand,
} from '../commands';
import {
    CreateEntityDtoInput,
    ModifyEntityDtoInput,
    RetrieveEntitiesDtoInput,
} from '../dtos/inputs';
import {
    EntityCreatedDtoOutput,
    EntityModifiedDtoOutput,
    EntityRetrievedDtoOutput,
} from '../dtos/outputs';
import { Entity } from '../models';
import { EntityRequestPipe } from '../pipes';
import { RetrieveEntitiesQuery, RetrieveEntityByIdQuery } from '../queries';

@ApiTransactionIdHeader()
@ApiTenantIdHeader()      // Include if customer-scoped
@ApiAccessKeyHeader()
@ApiTags('Entities')
@Controller('entities')
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor)  // Choose appropriate interceptor
@UsePipes(MonitoringRequestPipe)
@UsePipes(EntityRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class EntityController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @ApiOkResponse({ type: EntityRetrievedDtoOutput, isArray: true })
    public async retrieve(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,  // Include if customer-scoped
        @Query() dtoInput: RetrieveEntitiesDtoInput,
    ): Promise<EntityRetrievedDtoOutput[]> {
        return await this.queryBus.execute<RetrieveEntitiesQuery, Entity[]>(
            new RetrieveEntitiesQuery(
                transactionId,
                dtoInput.pageSize,
                dtoInput.pageNumber,
                dtoInput.namePattern,
            )
        );
    }

    @Get(':id')
    @ApiParam({ name: 'id', type: Number, required: true })
    @ApiOkResponse({ type: EntityRetrievedDtoOutput })
    public async retrieveById(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,  // Include if customer-scoped
        @Param('id') id: number,
    ): Promise<EntityRetrievedDtoOutput> {
        return await this.queryBus.execute<RetrieveEntityByIdQuery, Entity>(
            new RetrieveEntityByIdQuery(transactionId, id)
        );
    }

    @Post()
    @ApiCreatedResponse({ type: EntityCreatedDtoOutput })
    public async create(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,  // Include if customer-scoped
        @Body() dtoInput: CreateEntityDtoInput,
    ): Promise<EntityCreatedDtoOutput> {
        return await this.commandBus.execute<CreateEntityCommand, Entity>(
            new CreateEntityCommand(transactionId, dtoInput.name, ...)
        );
    }

    @Patch(':id')
    @ApiParam({ name: 'id', type: Number, required: true })
    @ApiOkResponse({ type: EntityModifiedDtoOutput })
    public async modify(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,  // Include if customer-scoped
        @Param('id') id: number,
        @Body(new NonEmptyBodyPipe()) dtoInput: ModifyEntityDtoInput,
    ): Promise<EntityModifiedDtoOutput> {
        await this.commandBus.execute(
            new ModifyEntityCommand(transactionId, id, dtoInput.name, ...)
        );
        return { id, modified: true };
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, required: true })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse()
    public async delete(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,  // Include if customer-scoped
        @Param('id') id: number,
    ): Promise<void> {
        await this.commandBus.execute(
            new DeleteEntityCommand(transactionId, id)
        );
    }
}
```

**Controller Decorator Selection**:

Choose decorators based on scoping:

| Scoping Pattern | Decorators                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Business Unit   | `@UseGuards(AccessGuard)` + `@UseInterceptors(BusinessUnitsScopeInterceptor)`                         |
| Customer        | `@UseGuards(AccessGuard)` + `@UseInterceptors(CustomersScopeInterceptor)`                             |
| Jump Group      | `@UseGuards(AccessGuard)` + `@UseInterceptors(CustomersScopeInterceptor, JumpGroupsScopeInterceptor)` |
| No Scoping      | No guards/interceptors                                                                                |

## Step 9: Create Request Pipe

The request pipe validates scoping and auto-populates filters.

**File**: `src/entity-name/pipes/entity-request.pipe.ts`

```typescript
import { Injectable, PipeTransform, ForbiddenException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Customer } from '../../customer/models';
import { RetrieveEntityByIdQuery } from '../queries';

@Injectable()
export class EntityRequestPipe implements PipeTransform {
    constructor(private readonly queryBus: QueryBus) {}

    async transform(value: any, metadata: any) {
        const request = value;
        const method = request.method;

        // Extract scope from interceptor
        const customers: Customer[] = request.customers || [];
        const customerNames = customers.map((c) => c.name);

        if (method === 'GET') {
            // Auto-populate filters if not provided
            if (!request.query.namePatterns || request.query.namePatterns.length === 0) {
                request.query.namePatterns = customerNames.map((name) => `%${name}%`);
            }
        } else if (method === 'POST') {
            // Validate entity name contains customer name
            const entityName = request.body.name;
            if (!customerNames.some((name) => entityName.includes(name))) {
                throw new ForbiddenException('Entity name must contain customer name');
            }
        } else if (method === 'PATCH' || method === 'DELETE') {
            // Validate entity belongs to allowed customer
            const entityId = parseInt(request.params.id, 10);
            const entity = await this.queryBus.execute(
                new RetrieveEntityByIdQuery(request.headers['x-transaction-id'], entityId),
            );

            if (!customerNames.some((name) => entity.name.includes(name))) {
                throw new ForbiddenException('Forbidden customer access');
            }
        }

        return value;
    }
}
```

## Step 10: Create DTOs

### Input DTOs

**File**: `src/entity-name/dtos/inputs/create-entity.dto-input.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEntityDtoInput {
    @ApiProperty({ description: 'Entity name', type: String, required: true })
    @IsNotEmpty()
    @IsString()
    public name!: string;

    // ... other properties with validation decorators
}
```

### Output DTOs

**File**: `src/entity-name/dtos/outputs/entity-retrieved.dto-output.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Entity } from '../../models';

export class EntityRetrievedDtoOutput {
    @ApiProperty({ description: 'Unique identifier', type: Number })
    public id!: number;

    @ApiProperty({ description: 'Entity name', type: String })
    public name!: string;

    // ... other properties

    @ApiProperty({ description: 'Creation timestamp', type: Date })
    public creationDate!: Date;

    public static from(entity: Entity): EntityRetrievedDtoOutput {
        const dto = new EntityRetrievedDtoOutput();
        dto.id = entity.id;
        dto.name = entity.name;
        dto.creationDate = entity.creationDate;
        return dto;
    }
}
```

## Step 11: Create Module

**File**: `src/entity-name/entity-name.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessGuard } from '../access/guards';
import { CustomersScopeInterceptor } from '../customer/interceptors';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { EntityController } from './controllers/entity.controller';
import { EntityRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';
import { EntityEntity } from './repositories/entities';
import { EntityRepositoryService } from './repositories/services';

@Module({
    imports: [
        TypeOrmModule.forFeature([EntityEntity]), // Only if database storage
        AppConfigModule,
    ],
    controllers: [EntityController],
    providers: [
        AccessGuard,
        CustomersScopeInterceptor, // Choose appropriate interceptor
        EntityRequestPipe,
        ...QueryHandlers,
        ...CommandHandlers,
        EntityRepositoryService, // Only if database storage
        // Add sagas if needed
    ],
    exports: [
        // Export services if needed by other modules
    ],
})
export class EntityNameModule {}
```

## Step 12: Register in AppModule

**File**: `src/app.module.ts`

```typescript
import { EntityNameModule } from './entity-name/entity-name.module';

@Module({
    imports: [
        // ... other imports
        EntityNameModule, // Add your new module
    ],
})
export class AppModule {}
```

## Step 13: Test Your Module

### Manual Testing

1. Start the application:

```bash
npm run start:dev
```

2. Access Swagger:

```
http://localhost:9000/open-api
```

3. Test endpoints:
    - Create entity (POST)
    - Retrieve entities (GET)
    - Modify entity (PATCH)
    - Delete entity (DELETE)

### Unit Tests

Create test files for:

- Command handlers
- Query handlers
- Controllers
- Pipes

**Example**: `src/entity-name/commands/handlers/create-entity.command-handler.spec.ts`

```typescript
import { Test } from '@nestjs/testing';
import { CreateEntityCommandHandler } from './create-entity.command-handler';

describe('CreateEntityCommandHandler', () => {
    let handler: CreateEntityCommandHandler;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                CreateEntityCommandHandler,
                // Mock dependencies
            ],
        }).compile();

        handler = module.get(CreateEntityCommandHandler);
    });

    it('should create entity', async () => {
        // Test logic
    });
});
```

## Checklist

Before considering your module complete:

- [ ] Module follows standard structure
- [ ] CQRS pattern implemented (commands, queries, handlers)
- [ ] Access control configured (guards, interceptors, pipes)
- [ ] DTOs created with validation decorators
- [ ] Swagger documentation decorators added
- [ ] Database entity created (if needed)
- [ ] Repository service created (if needed)
- [ ] Request pipe validates scoping
- [ ] Events emitted for state changes (if needed)
- [ ] Module registered in AppModule
- [ ] Endpoints tested manually
- [ ] Unit tests written
- [ ] Module added to [Module Dependencies](../architecture/MODULE_DEPENDENCIES.md)
- [ ] Route, guard, header or DTO changes: Postman collection regenerated (`npm run postman:generate`, `npm run postman:check`)

## Adding an endpoint to an existing module

Use this procedure when the module already exists. Hard rules (CQRS split, tenant and scope safety, boundaries) are in [AGENTS.md](../../AGENTS.md); this section only lists the work.

1. Read the neighbouring controller, handlers and pipe of the same module and reuse their decorators, guards, interceptors and request pipes before adding an abstraction.
2. Add the input and output DTOs (`dtos/inputs`, `dtos/outputs`) with validation and Swagger decorators. Naming: Create, Retrieve, Modify, Delete.
3. Add the command or query class and its handler in the matching folder, and register the handler in the module's `CommandHandlers` or `QueryHandlers` array. A handler that is not in the providers is never discovered.
4. Add the controller route. The controller stays thin: validate the DTO, read headers through the existing decorators (`ApiTenantIdHeader`, `TenantIdHeader`, transaction id), dispatch through `CommandBus` or `QueryBus`.
5. Keep access and scope enforcement in place: `AccessGuard`, the module's scope interceptors and request pipe. If a repository filter changed, add or update a test that asserts the scope or tenant isolation.
6. Propagate `tenantId` and the transaction id from the controller through the command or query to every service, repository and pra-sync-api call. Never default or re-derive the tenant.
7. Add a unit test next to each changed file (`*.spec.ts`).
8. Verify: `npx eslint <changed files>`, `npx jest <path>`, `npx tsc -p tsconfig.build.json --noEmit`, and `npm run build` when module wiring changed.
9. Regenerate the Postman collection (`npm run postman:generate`, `npm run postman:check`); a new guard, interceptor, pipe or parameter decorator must be classified first. See [postman/README.md](../../postman/README.md).

Report the result as: files changed with one line of purpose each, why the CQRS split is correct, the scope and tenant checks applied, tests added or updated, and the commands run with their outcome.

## Changing an API contract

A contract change is any change to a path, method, required or optional header, request or response DTO, status code, error shape, authentication or authorization behaviour, or a configuration key that another repository reads.

1. Classify the change as compatible, partially compatible or breaking. Prefer additive changes: the console and the SOC integration consume the response DTOs. A breaking change needs an approved and versioned plan and a documented migration impact.
2. Implement it with the same rules as a new endpoint: validation in the DTO, behaviour in handlers, scope and tenant flow explicit from controller to downstream call, controllers thin.
3. Keep the boundaries: pra-api is the public contract owner for the console; BeyondTrust integration belongs in pra-sync-api, UI shaping belongs in the console.
4. Apply the [cross-repository contract checklist](../../../docs/knowledge/cross-repo-contracts.md): mark the change as coupled, name the impacted repositories, state the rollout order and the supported mixed versions, and list the test evidence per boundary.
5. Regenerate the Postman collection (see above).
6. Report: files changed with purpose, contract deltas (headers, request and response DTOs, error and status behaviour), the checks applied, validation commands and outcomes, and the follow-up work per repository.

## Related Documentation

- [CQRS Implementation](../architecture/CQRS_IMPLEMENTATION.md)
- [Module Dependencies](../architecture/MODULE_DEPENDENCIES.md)
- [System Overview](../architecture/SYSTEM_OVERVIEW.md)
- [Quick Start Guide](./QUICK_START.md)

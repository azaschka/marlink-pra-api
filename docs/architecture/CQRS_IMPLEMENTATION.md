# CQRS Implementation Guide

## Overview

The PRA API implements **CQRS (Command Query Responsibility Segregation)** using NestJS's `@nestjs/cqrs` package. This architectural pattern strictly separates read operations (queries) from write operations (commands), providing clear boundaries and scalability.

## Core Principles

### 1. **Command-Query Separation**

- **Commands** - Modify state, return created/modified entities
- **Queries** - Read state, never modify data
- **Events** - Notify about state changes, trigger workflows
- **Sagas** - Orchestrate complex workflows by listening to events

### 2. **Unidirectional Data Flow**

```
Controller → Command/Query → Handler → Repository/API → Database/External API
                    ↓
                  Event
                    ↓
                  Saga → Command → Handler → ...
```

### 3. **Location Independence**

Handlers are decoupled from controllers - they're wired via the CommandBus/QueryBus, enabling:

- Easy testing
- Cross-module communication
- Event-driven workflows

## Module Structure

Every CQRS module follows this structure:

```
module-name/
├── commands/
│   ├── index.ts                          # Export all commands
│   ├── create-entity.command.ts          # Command classes
│   ├── modify-entity.command.ts
│   ├── delete-entity.command.ts
│   └── handlers/
│       ├── index.ts                      # Export CommandHandlers array
│       ├── create-entity.command-handler.ts
│       ├── modify-entity.command-handler.ts
│       └── delete-entity.command-handler.ts
│
├── queries/
│   ├── index.ts                          # Export all queries
│   ├── retrieve-entities.query.ts        # Query classes
│   ├── retrieve-entity-by-id.query.ts
│   └── handlers/
│       ├── index.ts                      # Export QueryHandlers array
│       ├── retrieve-entities.query-handler.ts
│       └── retrieve-entity-by-id.query-handler.ts
│
├── events/
│   ├── index.ts                          # Export all events
│   ├── entity-created.event.ts           # Event classes
│   ├── entity-modified.event.ts
│   └── entity-deleted.event.ts
│
├── sagas/                                # Optional - for event-driven workflows
│   └── index.ts                          # Saga classes
│
├── workflows/                            # Optional - for complex processes
│   └── complex-workflow.ts
│
├── controllers/
│   └── entity.controller.ts              # HTTP endpoints
│
├── models/
│   └── entity.model.ts                   # Domain interfaces
│
└── module-name.module.ts
    providers: [
        ...QueryHandlers,                 # Register query handlers
        ...CommandHandlers,               # Register command handlers
        OptionalSaga,                     # Register saga if exists
        RepositoryService,                # Repository services
    ]
```

## Commands (Write Operations)

### Command Class

Commands are **immutable data structures** that describe an intent to change state.

**File**: `src/customer/commands/create-customer.command.ts`

```typescript
export class CreateCustomerCommand {
    constructor(
        public readonly transactionId: string,
        public readonly key: string,
        public readonly name: string,
        public readonly businessUnit: string,
        public readonly beyondtrustInstanceId: number,
    ) {}
}
```

**Best Practices**:

- ✅ Use `public readonly` for all properties (immutability)
- ✅ Include `transactionId` for request correlation
- ✅ Use descriptive names (verb + noun): `CreateCustomer`, `ModifyCustomer`, `DeleteCustomer`
- ✅ Keep commands simple - just data, no logic

### Command Handler

Handlers execute the business logic for commands.

**File**: `src/customer/commands/handlers/create-customer.command-handler.ts`

```typescript
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';

@CommandHandler(CreateCustomerCommand)
export class CreateCustomerCommandHandler implements ICommandHandler<CreateCustomerCommand> {
    constructor(
        private readonly queryBus: QueryBus, // For validation queries
        private readonly commandBus: CommandBus, // For nested commands
        private readonly eventBus: EventBus, // For publishing events
        private readonly repositoryService: CustomerRepositoryService,
        private readonly appConfigService: AppConfigService,
    ) {}

    public async execute(command: CreateCustomerCommand): Promise<Customer> {
        // 1. Validate inputs (using queries)
        await this.validateBeyondTrustInstanceId(command.transactionId, command.beyondtrustInstanceId);
        await this.validateCustomerKeyAndName(command.transactionId, command.key, command.name);

        // 2. Run complex workflows if needed
        await this.runWorkflow(command.transactionId, command.name, command.beyondtrustInstanceId);

        // 3. Create/modify entities
        const entity = CustomerEntity.createWithoutId(
            command.key,
            command.name,
            command.businessUnit,
            false, // isDeactivated
            command.beyondtrustInstanceId,
        );
        const created = await this.repositoryService.create(entity);

        // 4. Publish domain events
        this.eventBus.publish(
            new CustomerCreatedEvent(command.transactionId, {
                customer: created,
            }),
        );

        // 5. Return result
        return created;
    }

    private async validateBeyondTrustInstanceId(transactionId: string, id: number): Promise<void> {
        const instance = await this.queryBus.execute<RetrieveBeyondtrustInstanceByIdQuery, BeyondtrustInstance>(
            new RetrieveBeyondtrustInstanceByIdQuery(transactionId, id),
        );

        if (!instance) {
            throw new NotFoundException(`BeyondTrust instance ${id} not found`);
        }
    }

    private async validateCustomerKeyAndName(transactionId: string, key: string, name: string): Promise<void> {
        const existingByKey = await this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
            new RetrieveCustomersQuery(transactionId, 1, 1, key, undefined),
        );

        if (existingByKey.length > 0) {
            throw new ConflictException(`Customer with key "${key}" exists`);
        }

        const existingByName = await this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
            new RetrieveCustomersQuery(transactionId, 1, 1, undefined, undefined, `%${name}%`),
        );

        if (existingByName.length > 0) {
            throw new ConflictException(`Customer "${name}" exists`);
        }
    }
}
```

**Handler Pattern**:

1. **Validate** - Use queries to check preconditions
2. **Execute** - Perform business logic (create/update entities)
3. **Emit Events** - Publish domain events for sagas
4. **Return** - Return created/modified entity

**Best Practices**:

- ✅ Inject `QueryBus`, `CommandBus`, `EventBus` for orchestration
- ✅ Use queries for validation (don't directly call repositories)
- ✅ Emit events for significant state changes
- ✅ Keep handlers focused (single responsibility)
- ✅ Use private methods for validation logic
- ✅ Always include transaction IDs in logs

### Command Registration

**File**: `src/customer/commands/handlers/index.ts`

```typescript
import { CreateCustomerCommandHandler } from './create-customer.command-handler';
import { DeactivateCustomerCommandHandler } from './deactivate-customer.command-handler';
import { ModifyCustomerCommandHandler } from './modify-customer.command-handler';
// ... other handlers

export const CommandHandlers = [
    CreateCustomerCommandHandler,
    DeactivateCustomerCommandHandler,
    ModifyCustomerCommandHandler,
    // ... other handlers
];
```

**File**: `src/customer/customer.module.ts`

```typescript
@Module({
    providers: [
        ...QueryHandlers, // Register queries first
        ...CommandHandlers, // Then commands
        // ... other providers
    ],
})
export class CustomerModule {}
```

## Queries (Read Operations)

### Query Class

Queries are **immutable data structures** that describe a request for data.

**File**: `src/customer/queries/retrieve-customer-by-id.query.ts`

```typescript
export class RetrieveCustomerByIdQuery {
    constructor(
        public readonly transactionId: string,
        public readonly customerId: number,
    ) {}
}
```

**Best Practices**:

- ✅ Use `public readonly` for immutability
- ✅ Include `transactionId` for logging
- ✅ Use descriptive names: `RetrieveX`, `FindXByY`, `ListXs`
- ✅ Include filter parameters as properties

### Query Handler

Handlers retrieve data without modifying state.

**File**: `src/customer/queries/handlers/retrieve-customer-by-id.query-handler.ts`

```typescript
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

@QueryHandler(RetrieveCustomerByIdQuery)
export class RetrieveCustomerByIdQueryHandler implements IQueryHandler<RetrieveCustomerByIdQuery> {
    constructor(private readonly repositoryService: CustomerRepositoryService) {}

    public async execute(query: RetrieveCustomerByIdQuery): Promise<Customer> {
        const customer = await this.repositoryService.findOneById(query.customerId);

        if (!customer) {
            throw new NotFoundException(`Customer with id ${query.customerId} not found`);
        }

        return customer;
    }
}
```

**Handler Pattern**:

1. **Retrieve** - Fetch data from repository or external API
2. **Transform** - Map to domain models if needed
3. **Validate** - Throw NotFoundException if not found (optional)
4. **Return** - Return domain model(s)

**Best Practices**:

- ✅ **Never modify state** in query handlers
- ✅ Return `null` or throw `NotFoundException` for missing entities
- ✅ Use repository services for database access
- ✅ Use HTTP services for external API calls
- ✅ Include transaction IDs in logs
- ✅ Handle errors gracefully (especially for external APIs)

### Query Registration

Same pattern as commands - export handlers array and register in module.

## Events (Domain Events)

### Event Class

Events are **immutable notifications** about state changes.

**File**: `src/customer/events/customer-deactivated.event.ts`

```typescript
export interface CustomerDeactivatedEventPayload {
    id: number;
    key: string;
    name: string;
}

export class CustomerDeactivatedEvent {
    constructor(
        public readonly transactionId: string,
        public readonly payload: CustomerDeactivatedEventPayload,
    ) {}
}
```

**Best Practices**:

- ✅ Use past tense: `CustomerCreated`, `CustomerDeactivated`
- ✅ Include payload with relevant data
- ✅ Make events immutable
- ✅ Include `transactionId` for correlation

### Publishing Events

Events are published by command handlers after state changes:

```typescript
// In CreateCustomerCommandHandler
this.eventBus.publish(
    new CustomerCreatedEvent(command.transactionId, {
        customer: createdCustomer,
    }),
);

// In DeactivateCustomerCommandHandler
this.eventBus.publish(
    new CustomerDeactivatedEvent(command.transactionId, {
        id: customer.id,
        key: customer.key,
        name: customer.name,
    }),
);
```

## Sagas (Event Orchestration)

Sagas listen to events and trigger commands, enabling **workflow choreography**.

**File**: `src/customer/sagas/index.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ICommand, Saga, ofType } from '@nestjs/cqrs';
import { Observable, map } from 'rxjs';

@Injectable()
export class CustomerSaga {
    // React to customer deactivation
    @Saga()
    public onCustomerDeactivatedEvent = (events$: Observable<CustomerDeactivatedEvent>): Observable<ICommand> => {
        return events$.pipe(
            ofType(CustomerDeactivatedEvent),
            map(
                (event) =>
                    new DisableUsersLoginAfterCustomerDeactivationCommand(
                        event.transactionId,
                        (event.payload as CustomerDeactivatedEventPayload).id,
                    ),
            ),
        );
    };

    // React to customer reactivation
    @Saga()
    public onCustomerReactivatedEvent = (events$: Observable<CustomerReactivatedEvent>): Observable<ICommand> => {
        return events$.pipe(
            ofType(CustomerReactivatedEvent),
            map(
                (event) =>
                    new EnableUsersLoginAfterCustomerReactivationCommand(
                        event.transactionId,
                        (event.payload as CustomerReactivatedEventPayload).id,
                    ),
            ),
        );
    };
}
```

**Saga Pattern**:

1. **Decorate** - Use `@Saga()` on methods
2. **Filter Events** - Use `ofType()` to filter specific event types
3. **Map to Commands** - Convert events to commands
4. **Return Observable** - Return `Observable<ICommand>`

**Best Practices**:

- ✅ Keep sagas simple - just event-to-command mapping
- ✅ Use RxJS operators for filtering and transformation
- ✅ Preserve transaction IDs across the workflow
- ✅ Use sagas for cross-module workflows
- ✅ Avoid complex logic in sagas (use workflows instead)

### Saga Registration

**File**: `src/customer/customer.module.ts`

```typescript
@Module({
    providers: [
        ...QueryHandlers,
        ...CommandHandlers,
        CustomerSaga, // Register saga
        // ... other providers
    ],
})
export class CustomerModule {}
```

## Workflows (Complex Business Processes)

For multi-step processes that don't fit in a single handler, use workflows.

**File**: `src/customer/workflows/administrator-group-policy.workflow.ts`

```typescript
export class AdministratorGroupPolicyWorkflow {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly customerName: string,
        private readonly beyondtrustInstanceId: number,
    ) {}

    public async getOrCreate(): Promise<GroupPolicy> {
        const groupPolicyName = this.buildGroupPolicyName();

        // Try to find existing
        const existing = await this.findExistingGroupPolicy(groupPolicyName);
        if (existing) {
            return existing;
        }

        // Create new if not found
        return await this.createGroupPolicy(groupPolicyName);
    }

    private buildGroupPolicyName(): string {
        const prefix = this.appConfigService.customer.groupPolicy.administratorPrefix;
        return `${prefix}${this.customerName}`;
    }

    private async findExistingGroupPolicy(name: string): Promise<GroupPolicy | null> {
        const results = await this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
            new RetrieveGroupPoliciesQuery(this.transactionId, this.beyondtrustInstanceId, [name]),
        );

        return results.length > 0 ? results[0] : null;
    }

    private async createGroupPolicy(name: string): Promise<GroupPolicy> {
        return await this.commandBus.execute<CreateGroupPolicyCommand, GroupPolicy>(
            new CreateGroupPolicyCommand(this.transactionId, this.beyondtrustInstanceId, name),
        );
    }
}
```

**Workflow Pattern**:

- Encapsulate multi-step processes
- Use QueryBus and CommandBus for orchestration
- Return domain models
- Idempotent operations (check before create)

**Best Practices**:

- ✅ Use workflows for complex, multi-step processes
- ✅ Make workflows reusable (inject dependencies)
- ✅ Use workflows in command handlers, not directly in controllers
- ✅ Keep workflows idempotent when possible

## Controller Integration

Controllers orchestrate CQRS operations via buses.

**File**: `src/customer/controllers/customer.controller.ts`

```typescript
@ApiTags('Customers')
@Controller('customers')
@UseGuards(AccessGuard)
@UseInterceptors(BusinessUnitsScopeInterceptor)
@UsePipes(CustomerRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
export class CustomerController {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
    ) {}

    @Get(':id')
    @ApiParam({ name: 'id', type: Number, required: true })
    @ApiOkResponse({ type: CustomerDtoOutput })
    public async retrieveById(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
    ): Promise<CustomerDtoOutput> {
        const customer = await this.queryBus.execute<RetrieveCustomerByIdQuery, Customer>(
            new RetrieveCustomerByIdQuery(transactionId, id),
        );

        return CustomerDtoOutput.from(customer);
    }

    @Post()
    @ApiCreatedResponse({ type: CustomerDtoOutput })
    public async create(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Body() dto: CreateCustomerDtoInput,
    ): Promise<CustomerDtoOutput> {
        const customer = await this.commandBus.execute<CreateCustomerCommand, Customer>(
            new CreateCustomerCommand(transactionId, dto.key, dto.name, dto.businessUnit, dto.beyondtrustInstanceId),
        );

        return CustomerDtoOutput.from(customer);
    }

    @Patch(':id')
    @ApiParam({ name: 'id', type: Number, required: true })
    @ApiOkResponse({ type: CustomerModifiedDtoOutput })
    @UsePipes(NonEmptyBodyPipe)
    public async modify(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @Param('id') id: number,
        @Body() dto: ModifyCustomerDtoInput,
    ): Promise<CustomerModifiedDtoOutput> {
        await this.commandBus.execute(new ModifyCustomerCommand(transactionId, id, dto));

        return { id, modified: true };
    }
}
```

**Controller Pattern**:

1. **Extract Parameters** - Use decorators for headers, params, body
2. **Create Command/Query** - Instantiate with parameters
3. **Execute via Bus** - Use `queryBus.execute()` or `commandBus.execute()`
4. **Transform Response** - Map to DTO using static factory methods
5. **Return** - Return DTO to client

**Best Practices**:

- ✅ Controllers should be **thin** - only orchestration
- ✅ Business logic belongs in handlers, not controllers
- ✅ Always use buses (QueryBus/CommandBus) - never call handlers directly
- ✅ Transform domain models to DTOs before returning
- ✅ Use DTO static factory methods: `DtoOutput.from(model)`

## Common Patterns

### Pattern 1: Simple CRUD

```typescript
// Query - Simple retrieval
@QueryHandler(RetrieveEntityByIdQuery)
export class RetrieveEntityByIdQueryHandler {
    constructor(private readonly repo: EntityRepositoryService) {}

    async execute(query: RetrieveEntityByIdQuery): Promise<Entity> {
        return await this.repo.findOneById(query.id);
    }
}

// Command - Simple creation
@CommandHandler(CreateEntityCommand)
export class CreateEntityCommandHandler {
    constructor(
        private readonly repo: EntityRepositoryService,
        private readonly eventBus: EventBus,
    ) {}

    async execute(command: CreateEntityCommand): Promise<Entity> {
        const entity = EntityEntity.createWithoutId(...command.props);
        const created = await this.repo.create(entity);

        this.eventBus.publish(new EntityCreatedEvent(command.transactionId, { entity: created }));

        return created;
    }
}
```

### Pattern 2: Validation Before Action

```typescript
@CommandHandler(CreateCustomerCommand)
export class CreateCustomerCommandHandler {
    constructor(
        private readonly queryBus: QueryBus,
        // ... other deps
    ) {}

    async execute(command: CreateCustomerCommand): Promise<Customer> {
        // Validate via queries
        await this.validateInputs(command);

        // Proceed with creation
        // ...
    }

    private async validateInputs(command: CreateCustomerCommand) {
        // Check if entity exists
        const existing = await this.queryBus.execute(new FindEntityQuery(command.key));

        if (existing) {
            throw new ConflictException('Entity already exists');
        }
    }
}
```

### Pattern 3: External API Integration

```typescript
@CommandHandler(CreateUserCommand)
export class CreateUserCommandHandler {
    constructor(
        private readonly httpService: HttpService,
        private readonly appConfig: AppConfigService,
    ) {}

    async execute(command: CreateUserCommand): Promise<User> {
        const url = `${this.appConfig.praSyncApi.baseUrl}/users`;

        try {
            const response = await firstValueFrom(
                this.httpService.post<User>(url, command.dto, {
                    headers: { ... },
                    timeout: 300000,
                }).pipe(timeout(300000))
            );

            return response.data;
        } catch (error) {
            return HttpErrorHandlerUtility.handle<User>(error, {
                transactionId: command.transactionId,
                context: 'Create user',
            });
        }
    }
}
```

### Pattern 4: Saga-Triggered Workflow

```typescript
// 1. Command emits event
@CommandHandler(DeactivateCustomerCommand)
export class DeactivateCustomerCommandHandler {
    async execute(command: DeactivateCustomerCommand): Promise<void> {
        // ... deactivate customer

        this.eventBus.publish(new CustomerDeactivatedEvent(command.transactionId, { id }));
    }
}

// 2. Saga listens and triggers new command
@Injectable()
export class CustomerSaga {
    @Saga()
    onCustomerDeactivated = (events$) => {
        return events$.pipe(
            ofType(CustomerDeactivatedEvent),
            map((event) => new DisableUsersLoginCommand(event.transactionId, event.payload.id)),
        );
    };
}

// 3. New command handler executes
@CommandHandler(DisableUsersLoginCommand)
export class DisableUsersLoginCommandHandler {
    async execute(command: DisableUsersLoginCommand): Promise<void> {
        // ... disable user logins
    }
}
```

## Best Practices Summary

### Commands

- ✅ Immutable classes with `readonly` properties
- ✅ Verb + noun naming (CreateCustomer, ModifyUser)
- ✅ Include transaction ID
- ✅ Publish events after state changes
- ✅ Use queries for validation

### Queries

- ✅ Immutable classes with `readonly` properties
- ✅ Retrieve/Find/List naming
- ✅ Include transaction ID
- ✅ Never modify state
- ✅ Handle not-found cases (throw NotFoundException or return null)

### Events

- ✅ Past tense naming (CustomerCreated, UserModified)
- ✅ Include payload with relevant data
- ✅ Immutable
- ✅ Published after successful state change

### Sagas

- ✅ One event type per saga method
- ✅ Simple event-to-command mapping
- ✅ Preserve transaction IDs
- ✅ Use for cross-module workflows

### Handlers

- ✅ Single responsibility
- ✅ Inject buses for orchestration
- ✅ Include comprehensive logging
- ✅ Use transaction IDs
- ✅ Handle errors gracefully

### Controllers

- ✅ Thin orchestration layer
- ✅ Use buses (never call handlers directly)
- ✅ Transform models to DTOs
- ✅ Apply guards, interceptors, pipes

## Adding New CQRS Operations

See [Adding New Module Guide](../guides/ADDING_NEW_MODULE.md) for step-by-step instructions, including the procedure for a new endpoint in an existing module.

## Related Documentation

- [Module Dependencies](./MODULE_DEPENDENCIES.md)
- [System Overview](./SYSTEM_OVERVIEW.md)
- [Developer Quick Start](../guides/QUICK_START.md)
- [Adding a module, endpoint or contract change](../guides/ADDING_NEW_MODULE.md)
- [AGENTS.md](../../AGENTS.md) (hard rules for this repository)

## External Resources

- [NestJS CQRS Documentation](https://docs.nestjs.com/recipes/cqrs)
- [CQRS Pattern (Martin Fowler)](https://martinfowler.com/bliki/CQRS.html)

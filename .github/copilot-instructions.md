# Marlink PRA API - AI Coding Agent Instructions

## Architecture Overview

This is a **NestJS-based CQRS API** for privilege access management using **TypeORM** with MySQL (MariaDB) and **@nestjs/cqrs** for command/query separation.

### Core Architectural Patterns

- **CQRS Implementation**: Every domain module follows strict command/query separation
- **Domain-Driven Design**: Each business domain (customer, user, team, site, jumpoint, etc.) is a separate module
- **Event-Driven Architecture**: Commands emit events handled by sagas for complex workflows
- **Repository Pattern**: TypeORM entities with dedicated repository services
- **External API Integration**: BeyondTrust API integration for privilege access management operations

## Module Structure Convention

Each domain module follows this **exact structure** (see `src/customer/` as reference):

```
module-name/
├── module-name.module.ts         # NestJS module with providers array
├── commands/                     # Write operations
│   ├── index.ts                 # Export all commands
│   ├── handlers/index.ts        # Export CommandHandlers array
│   └── *.command.ts             # Command classes
├── queries/                     # Read operations
│   ├── index.ts                 # Export all queries
│   ├── handlers/index.ts        # Export QueryHandlers array
│   └── *.query.ts               # Query classes
├── controllers/                 # HTTP endpoints
├── models/                      # Domain interfaces
├── repositories/
│   └── entities/                # TypeORM entities with static factory methods
├── events/                      # Domain events
├── dtos/                        # Request/response DTOs
├── enums/                       # Domain enumerations
├── sagas/                       # Event handlers for workflows (optional)
└── workflows/                   # Complex business processes (optional)
```

## CQRS Pattern Implementation

### Command Handlers

```typescript
@CommandHandler(CreateCustomerCommand)
export class CreateCustomerCommandHandler implements ICommandHandler<CreateCustomerCommand> {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        // repository services
    ) {}

    async execute(command: CreateCustomerCommand): Promise<DomainModel> {
        // 1. Validate via queries
        // 2. Create/update entities
        // 3. Emit domain events
        // 4. Return domain model
    }
}
```

### Module Registration Pattern

All modules must register handlers in their module providers:

```typescript
providers: [
    ...QueryHandlers, // from queries/handlers/index.ts
    ...CommandHandlers, // from commands/handlers/index.ts
    RepositoryService,
    OptionalSaga,
];
```

### Saga Pattern for Event-Driven Workflows

Use sagas to orchestrate complex workflows triggered by domain events:

```typescript
@Injectable()
export class DomainSaga {
    @Saga()
    public onDomainEvent = (events$: Observable<DomainEvent>): Observable<ICommand> => {
        return events$.pipe(
            ofType(DomainEvent),
            map((event) => new TriggeredCommand(event.transactionId, (event.payload as DomainEventPayload).id)),
        );
    };
}
```

**Guidelines:**

- Use sagas for cross-domain workflows (e.g., customer deactivation triggering user login disables)
- Each saga method should be decorated with `@Saga()`
- Use `ofType()` operator to filter specific event types
- Map events to commands for execution
- Register sagas in module providers array
- Keep saga logic simple - complex workflows belong in dedicated workflow classes

## Controller Patterns

All controllers follow consistent decorator and validation patterns:

```typescript
@ApiTenantIdHeader() // Swagger docs for tenant header
@ApiTransactionIdHeader() // Swagger docs for transaction header
@ApiAccessKeyHeader() // Swagger docs for access key header
@ApiTags('Domain') // Swagger grouping
@Controller('domain-entities') // Route prefix
@UseGuards(AccessGuard) // Permission-based access control
@UseInterceptors(CustomersScopeInterceptor) // Tenant data scoping
@UsePipes(DomainRequestPipe) // Domain-specific validation/transformation
@UsePipes(new ValidationPipe({ transform: true })) // Global DTO validation
export class DomainController {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
    ) {}

    @Get()
    public async retrieve(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Query() dtoInput: RetrieveDtoInput,
    ): Promise<DomainDtoOutput[]> {
        return await this.queryBus.execute(new RetrieveQuery(transactionId, tenantId, ...params));
    }

    @Patch(':id')
    @ApiParam({ name: 'id', type: Number, required: true })
    @ApiOkResponse({ type: DomainModifiedDtoOutput })
    @UsePipes(NonEmptyBodyPipe) // Ensures PATCH body is not empty
    public async modify(
        @TransactionIdHeader() transactionId: string = UuidUtility.generate(),
        @TenantIdHeader() tenantId: number,
        @Param('id') id: number,
        @Body() dtoInput: ModifyDtoInput,
    ): Promise<DomainModifiedDtoOutput> {
        return await this.commandBus.execute(new ModifyCommand(transactionId, tenantId, id, dtoInput));
    }
}
```

### Controller Decorator Layers (Applied in Order)

1. **Class-level API documentation**: `@ApiTenantIdHeader()`, `@ApiTransactionIdHeader()`, `@ApiAccessKeyHeader()`, `@ApiTags()`
2. **Route configuration**: `@Controller(prefix)`
3. **Security**: `@UseGuards(AccessGuard)` for permission checks
4. **Data scoping**: `@UseInterceptors(CustomersScopeInterceptor)` or `@UseInterceptors(BusinessUnitsScopeInterceptor)`
5. **Validation**: `@UsePipes(DomainRequestPipe)` then `@UsePipes(new ValidationPipe({ transform: true }))`

### Interceptor Selection

- **CustomersScopeInterceptor**: For customer-scoped entities (users, teams, group policies, jump items, etc.)
- **BusinessUnitsScopeInterceptor**: For business unit access control (customers module only)
- **Multiple interceptors**: Can be chained - e.g., `@UseInterceptors(CustomersScopeInterceptor, JumpGroupsScopeInterceptor)`

### Pipe Usage Patterns

- **ValidationPipe**: Always use `new ValidationPipe({ transform: true })` to enable DTO transformation
- **NonEmptyBodyPipe**: Apply to PATCH endpoints to ensure request body is not empty
- **Domain-specific pipes**: Custom validation/transformation logic (e.g., `UserRequestPipe`, `JumpointRequestPipe`)
- **Multiple pipes**: Stack in order - domain-specific first, then global validation

### Header Parameters

- **Transaction tracking**: All endpoints accept optional `X-Transaction-Id` header for request correlation
- **Tenant isolation**: Required `X-Tenant-Id` header for multi-tenant data scoping (most endpoints except monitoring, health, and admin endpoints)
- **Access control**: Required `X-Access-Key` header for permission-based operations (customer-scoped and BU-scoped endpoints)

**Note:** Some internal/admin endpoints (monitoring, health checks, auth, BeyondTrust instances) don't require tenant headers.

## TypeORM Entity Conventions

- **Table naming**: `pra_` prefix (e.g., `pra_customers`)
- **Column naming**: snake_case in database, camelCase in TypeScript
- **Static factory methods**: `Entity.create()` and `Entity.createWithoutId()`
- **Timestamps**: Always include `@CreateDateColumn` and `@UpdateDateColumn`

```typescript
@Entity({ name: 'pra_domain_entities' })
export class DomainEntity implements DomainModel {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @Column({ name: 'snake_case_column', type: 'varchar' })
    public camelCaseProperty!: string;

    @CreateDateColumn({ name: 'creation_date', type: 'timestamp' })
    public creationDate!: Date;

    public static create(/* params */): DomainEntity {
        /* factory logic */
    }
    public static createWithoutId(/* params */): DomainEntity {
        /* factory logic */
    }
}
```

## Authentication & Authorization

- **Multi-strategy auth**: API Key (`ApiKeyStrategy`), JWT (`JwtStrategy`), Local (`LocalStrategy`)
- **Global throttling**: Rate limiting via `ThrottlerGuard`
- **Business unit scoping**: Use `BusinessUnitsScopeInterceptor` in module providers for tenant isolation
- **Access control**: `AccessGuard` for permission-based access
- **Required headers**: Most controllers use `@ApiTenantIdHeader()` and `@TenantIdHeader()` for tenant scoping (exceptions: monitoring, health, auth, BeyondTrust instance management)

## Configuration Management

Configuration via `AppConfigService` with environment variables:

- Database: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- Auth: `PRA_API_KEY`, `JWT_SECRET`, `JWT_EXPIRY`
- Features: `THROTTLE_TTL_MS`, `THROTTLE_LIMIT`, `THROTTLE_ENABLED`

## Development Workflows

### Local Development

```bash
npm run start:dev          # Watch mode
npm run start:debug        # Debug mode
npm run db:start:local     # Start MariaDB container
```

### Testing

```bash
npm run test              # Unit tests
npm run test:e2e          # End-to-end tests
npm run test:cov          # Coverage report
```

### Docker & Deployment

```bash
npm run docker:build:api    # Build container
npm run publish:api         # Full build & push pipeline
```

## Key Integrations

- **BeyondTrust API**: Privilege access management system integration
- **Email service**: MJML templates with Handlebars
- **Health checks**: Database, disk, memory, and external API monitoring
- **Swagger/OpenAPI**: Auto-generated docs at `/open-api`
- **Monitoring**: Endpoint access tracking via `MonitoringModule` and `MonitoringRequestPipe` (records all endpoint calls for analytics)

## Error Handling & Logging

- **Global exception filter**: `AllExceptionsFilter` with database and console logging
- **Transaction ID tracking**: Use `TRANSACTION_ID_HEADER` for request correlation
- **Timeout handling**: Global 180s timeout via `TimeoutInterceptor`
- **Graceful shutdown**: Process signal handlers (SIGTERM, SIGINT, SIGUSR2) for proper Kubernetes lifecycle
- **Console logging**: All exceptions logged to stdout for debugging, especially for terminated pods

### Query/Command Handler Error Handling

Use `HttpErrorHandlerUtility` for consistent error handling in query/command handlers that make HTTP calls:

```typescript
import { HttpErrorHandlerUtility } from '../../../shared/utilities';

@QueryHandler(RetrieveQuery)
export class RetrieveQueryHandler implements IQueryHandler<RetrieveQuery> {
    public async execute(query: RetrieveQuery): Promise<Result[]> {
        try {
            const response = await firstValueFrom(this.httpService.get(url));
            return response.data;
        } catch (error) {
            return HttpErrorHandlerUtility.handle<Result[]>(error, {
                transactionId: query.transactionId,
                context: `Entity ${query.entityId} sub-resource`,
                returnEmptyOn404: true, // For optional resources in bulk operations
                emptyValue: [],
            });
        }
    }
}
```

**Guidelines:**

- Use `returnEmptyOn404: true` for optional sub-resources (nodes, installers, configurations)
- Set `returnEmptyOn404: false` (or omit) for required resources
- Always provide descriptive `context` for logging
- Include entity IDs in context for traceability
- This prevents unhandled exceptions during saga-triggered bulk operations

## Access Control & Authorization Architecture

The API implements a **multi-layered access control system** using Guards, Interceptors, and Pipes. This section documents the complete authorization flow.

### Layer 1: AccessGuard (Authentication & Access Key Validation)

**File:** `src/access/guards/access.guard.ts`

**Purpose:** Validates the `X-Access-Key` header and loads the Access record with associated business units.

**Flow:**

1. Extracts `X-Access-Key` from request headers
2. Queries Access table to validate the key
3. Stores Access object in `request.authInfo.access` for downstream use
4. Access object contains `value.businessUnits` array (e.g., `["BU1", "BU2"]`)

**Usage:** Applied to all controllers via `@UseGuards(AccessGuard)`

**Type Safety:** Extended via `src/types/express.d.ts`:

```typescript
interface AuthInfo {
    access: Access; // Contains id, key, name, value: { businessUnits: BusinessUnit[] }
}
```

---

### Layer 2: Scope Interceptors (Data Filtering)

Interceptors run after guards and **populate request context** with allowed entities based on business units from the Access key.

#### 2.1 BusinessUnitsScopeInterceptor

**File:** `src/access/interceptors/business-units-scope.interceptor.ts`

**Purpose:** Extracts and validates business units from Access key.

**Flow:**

1. Reads `request.authInfo.access.value.businessUnits`
2. Validates business units exist and are not empty
3. Stores in `request.businessUnits`

**Used By:** Customer module (`@UseInterceptors(BusinessUnitsScopeInterceptor)`)

**Output:** `request.businessUnits: BusinessUnit[]`

---

#### 2.2 CustomersScopeInterceptor

**File:** `src/customer/interceptors/customers-scope.interceptor.ts`

**Purpose:** Queries and filters customers based on allowed business units.

**Flow:**

1. Reads `request.authInfo.access.value.businessUnits`
2. Queries customers filtered by those business units
3. Validates at least one customer exists (throws 403 if none found)
4. Stores in `request.customers`

**Used By:** Most modules (users, teams, sites, jump groups, jumpoints, etc.)

**Output:** `request.customers: Customer[]` (filtered by business units)

**Dependency:** Requires `AccessGuard` to run first

---

#### 2.3 JumpGroupsScopeInterceptor

**File:** `src/jump-group/interceptors/jump-groups-scope.interceptor.ts`

**Purpose:** Queries all jump groups and filters them based on allowed customer names.

**Flow:**

1. Reads `request.customers` (populated by CustomersScopeInterceptor)
2. Queries **all** jump groups from external API
3. Filters jump groups where `jumpGroup.name` contains any allowed customer name (case-insensitive)
4. This ensures only jump groups belonging to customers in allowed business units are accessible
5. Stores filtered result in `request.jumpGroups`

**Used By:** Jump item modules (remote-rdp, remote-vnc, web-jump, shell-jump, protocol-tunnel-jump), jump-client modules

**Output:** `request.jumpGroups: JumpGroup[]` (filtered by customer name matching)

**Dependency Chain:** `AccessGuard` → `CustomersScopeInterceptor` → `JumpGroupsScopeInterceptor`

**Naming Convention:** Jump groups must contain customer name in their name field (e.g., "CustomerA-Production", "CustomerB-Dev")

**Note:** Unlike other interceptors, `JumpGroupsScopeInterceptor` is applied directly on controllers, not registered in module providers. It requires `QueryBus` injection.

---

### Layer 3: Request Pipes (Parameter Validation & Auto-Population)

Pipes run after interceptors and **validate/transform request parameters** to ensure they match allowed scopes.

#### 3.1 Customer-Scoped Pipes

**Pattern:** Used by entities that belong to customers (users, teams, sites, jumpoints, jump groups, group policies)

**Examples:**

- `UserRequestPipe` - validates user names contain allowed customer names
- `TeamRequestPipe` - validates team names contain allowed customer names
- `SiteRequestPipe` - validates sites belong to allowed customers
- `JumpointRequestPipe` - validates jumpoint names contain allowed customer names
- `JumpGroupRequestPipe` - validates jump group names contain allowed customer names
- `GroupPolicyRequestPipe` - validates group policy names contain allowed customer names

**Validation Logic:**

1. Reads `request.customers` from CustomersScopeInterceptor
2. For **GET (query)**: If no name patterns provided, auto-populates with `%CustomerName%` patterns
3. For **POST (create)**: Validates entity name contains an allowed customer name
4. For **PATCH/DELETE (modify/delete)**: Queries entity by ID and validates it belongs to allowed customer

**Example (UserRequestPipe):**

```typescript
// GET /users - auto-populate filter
if (publicDisplayNamePatternsQuery.length === 0) {
    dto.publicDisplayNamePatterns = customerScopes.map((c) => `%${c.name}%`);
}

// POST /users - validate creation
if (!customerScopeNames.some((name) => dto.publicDisplayName.includes(name))) {
    throw new ForbiddenException('Forbidden customer access');
}

// PATCH /users/:id - validate access
const user = await queryBus.execute(new RetrieveUserByIdQuery(id));
if (!customerScopeNames.some((name) => user.publicDisplayName.includes(name))) {
    throw new ForbiddenException('Forbidden customer access');
}
```

---

#### 3.2 Business Unit-Scoped Pipes

**Pattern:** Used by entities directly tied to business units (customers)

**Example:** `CustomerRequestPipe`

**Validation Logic:**

1. Reads `request.businessUnits` from BusinessUnitsScopeInterceptor
2. For **GET (query)**: If no business units provided, auto-populates with allowed business units
3. For **POST (create)**: Validates customer business unit is in allowed list
4. For **PATCH/DELETE (modify/delete)**: Queries customer and validates business unit

---

#### 3.3 Jump Group-Scoped Pipes

**Pattern:** Used by entities that belong to jump groups (jump items, jump clients)

**Examples:**

- `JumpClientRequestPipe` - validates jump clients belong to allowed jump groups
- `RemoteRdpRequestPipe` - validates RDP items belong to allowed jump groups
- `RemoteVncRequestPipe` - validates VNC items belong to allowed jump groups
- `WebJumpRequestPipe` - validates web jumps belong to allowed jump groups
- `ShellJumpRequestPipe` - validates shell jumps belong to allowed jump groups
- `ProtocolTunnelJumpRequestPipe` - validates protocol tunnels belong to allowed jump groups

**Validation Logic:**

1. Reads `request.jumpGroups` from JumpGroupsScopeInterceptor
2. For **GET (query)**: If no jump group IDs provided, auto-populates with allowed jump group IDs
3. For **POST (create)**: Validates jump group ID is in allowed list
4. For **PATCH/DELETE (modify/delete)**: Queries entity and validates its jump group ID

---

### Complete Authorization Flow Examples

#### Example 1: GET /users (Customer-Scoped Entity)

```
1. AccessGuard
   - Validates X-Access-Key: "key123"
   - Loads Access: { key: "key123", value: { businessUnits: ["BU1", "BU2"] } }
   - Sets request.authInfo.access

2. CustomersScopeInterceptor
   - Queries customers with businessUnit IN ["BU1", "BU2"]
   - Result: [{ id: 1, name: "CustomerA" }, { id: 2, name: "CustomerB" }]
   - Sets request.customers

3. UserRequestPipe
   - Reads request.customers
   - Auto-populates: dto.publicDisplayNamePatterns = ["%CustomerA%", "%CustomerB%"]
   - Users query filtered by these patterns

Result: Only users with names containing "CustomerA" or "CustomerB" are returned
```

#### Example 2: GET /jump-items/remote-rdps (Jump Group-Scoped Entity)

```
1. AccessGuard
   - Validates X-Access-Key
   - Sets request.authInfo.access with businessUnits: ["BU1"]

2. CustomersScopeInterceptor
   - Queries customers with businessUnit = "BU1"
   - Result: [{ id: 1, name: "CustomerA", businessUnit: "BU1" }]
   - Sets request.customers

3. JumpGroupsScopeInterceptor
   - Queries ALL jump groups from external API
   - Filters where jumpGroup.name.includes("CustomerA")
   - Result: [{ id: 10, name: "CustomerA-Production" }, { id: 11, name: "CustomerA-Dev" }]
   - Sets request.jumpGroups

4. RemoteRdpRequestPipe
   - Reads request.jumpGroups
   - Auto-populates: dto.jumpGroupIds = [10, 11]
   - RDP items query filtered by these jump group IDs

Result: Only RDP items in CustomerA's jump groups are returned
```

#### Example 3: POST /customers (Business Unit-Scoped Entity)

```
1. AccessGuard
   - Validates X-Access-Key
   - Sets request.authInfo.access with businessUnits: ["BU1", "BU2"]

2. BusinessUnitsScopeInterceptor
   - Extracts businessUnits: ["BU1", "BU2"]
   - Sets request.businessUnits

3. CustomerRequestPipe
   - Reads request.businessUnits
   - Validates: dto.businessUnit IN ["BU1", "BU2"]
   - If not, throws ForbiddenException

Result: Customer can only be created in BU1 or BU2
```

---

### Controller Decorator Patterns

**Standard Pattern for Customer-Scoped Entities:**

```typescript
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor)
@UsePipes(EntityRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
```

**Pattern for Business Unit-Scoped Entities (Customers only):**

```typescript
@UseGuards(AccessGuard)
@UseInterceptors(BusinessUnitsScopeInterceptor)
@UsePipes(CustomerRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
```

**Pattern for Jump Group-Scoped Entities:**

```typescript
@UseGuards(AccessGuard)
@UseInterceptors(CustomersScopeInterceptor, JumpGroupsScopeInterceptor)
@UsePipes(EntityRequestPipe)
@UsePipes(new ValidationPipe({ transform: true }))
```

---

### Key Design Principles

1. **Layered Security**: Guard → Interceptor(s) → Pipe(s) provides defense in depth
2. **Fail-Secure**: If any layer fails validation, request is rejected with 403 Forbidden
3. **Auto-Population**: Pipes automatically restrict query parameters to allowed scopes if not specified
4. **Type Safety**: All request properties are type-safe via Express type extensions
5. **Audit Trail**: All layers log with transaction IDs for full request traceability
6. **Naming Conventions**:
    - Users/Teams/Sites/Jumpoints/Groups must contain customer name
    - Jump groups must contain customer name
    - Customers are directly tied to business units

---

### Adding New Endpoints: Security Checklist

When creating new endpoints, follow this checklist:

- [ ] Apply `@UseGuards(AccessGuard)` to controller
- [ ] Determine entity scope (business unit, customer, or jump group)
- [ ] Apply appropriate interceptor(s):
    - Business unit scope: `BusinessUnitsScopeInterceptor`
    - Customer scope: `CustomersScopeInterceptor`
    - Jump group scope: `CustomersScopeInterceptor, JumpGroupsScopeInterceptor`
- [ ] Create or use existing RequestPipe for validation
- [ ] Ensure pipe validates:
    - GET: Auto-populates filters if not provided
    - POST: Validates entity belongs to allowed scope
    - PATCH/DELETE: Queries entity and validates scope
- [ ] Add comprehensive logging with transaction IDs
- [ ] Document any naming conventions for the entity type

---

## Critical Business Rules

- **Customer deactivation**: Triggers user login disable workflow via saga
- **Business unit isolation**: All operations scoped by business unit access
- **Audit logging**: All operations logged with transaction ID and user context
- **Graceful shutdown**: Enabled for proper K8s deployment lifecycle
- **Naming conventions**: Entity names must contain customer names for proper scoping

## Monitoring & Analytics

### Monitoring Module

**Purpose:** Tracks all endpoint access for usage analytics and audit trails

**Location:** `src/monitoring/`

**Key Components:**

- **MonitoringRequestPipe**: Automatically applied to controllers to record endpoint calls
- **MonitoringRecordEntity**: Stores endpoint path and timestamp in `pra_monitorings` table
- **Monitoring endpoints**: `/monitorings` (GET, DELETE) for retrieving and cleaning up monitoring records

**Usage Pattern:**

```typescript
@Controller('example')
@UsePipes(MonitoringRequestPipe) // Records all endpoint calls
@UsePipes(new ValidationPipe({ transform: true }))
export class ExampleController {
    // endpoints automatically tracked
}
```

**Database Schema:**

- Table: `pra_monitorings`
- Columns: `id`, `endpoint_path`, `creation_date`
- No tenant isolation (tracks all endpoint accesses globally)

**Access Control:**

- Monitoring endpoints do NOT require `X-Tenant-Id` or `X-Access-Key` headers
- Used for internal analytics and monitoring purposes
- Should be restricted at network/ingress level in production

## External API Integration Patterns

### HTTP Module Configuration

When integrating with external APIs, configure `HttpModule` with proper connection pooling:

```typescript
@Module({
    imports: [
        AppConfigModule,
        HttpModule.register({
            timeout: 300000, // 5 minutes for slow APIs
            maxRedirects: 5,
            httpAgent: new HttpAgent({ keepAlive: true, maxSockets: 50 }),
            httpsAgent: new HttpsAgent({ keepAlive: true, maxSockets: 50 }),
        }),
    ],
    // ...
})
```

**Key considerations:**

- Import `Agent` from `http` and `https` Node.js modules (not plain objects)
- Use connection pooling (`keepAlive: true`) to reduce overhead
- Set appropriate `maxSockets` based on expected concurrency
- Configure timeouts based on external API SLA characteristics

### Batched Processing for Bulk Operations

When making multiple external API calls, use **batched processing** instead of full concurrency to avoid overwhelming external services:

```typescript
// Bad: All requests concurrent (can overwhelm external API)
const promises = items.map((item) => this.processItem(item));
const results = await Promise.all(promises);

// Good: Batched with controlled concurrency
const BATCH_SIZE = 2;
const BATCH_DELAY_MS = 2000;
const results = [];

for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)}`);

    const batchResults = await Promise.allSettled(batch.map((item) => this.processItem(item)));

    results.push(...batchResults);

    // Delay between batches (except for last batch)
    if (i + BATCH_SIZE < items.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
}
```

**Guidelines:**

- **Batch size**: Start with 2-3 concurrent requests, adjust based on external API capacity
- **Delays**: 2-3 seconds between batches allows API recovery time
- **Error handling**: Use `Promise.allSettled` to capture both successes and failures
- **Logging**: Log batch progress with transaction IDs for monitoring
- **Partial failures**: Design endpoints to return partial results when some requests fail

### Timeout Strategy

Implement **dual timeout protection** for external API calls:

```typescript
// In command handler
const response = await firstValueFrom(
    this.httpService
        .post<ResponseType>(url, body, {
            headers,
            timeout: 300000, // Axios-level timeout (connection + response)
        })
        .pipe(
            timeout(300000), // RxJS-level timeout (application-level)
        ),
);
```

**Timeout configuration:**

- **Fast APIs**: 15-30 seconds (standard operations)
- **Slow APIs**: 3-5 minutes (data processing, bulk operations)
- **Health checks**: 10 seconds maximum
- Always use both Axios and RxJS timeouts for robust protection

### Logging for External API Calls

Include comprehensive logging with transaction correlation:

```typescript
console.log(`[${transactionId}] Starting external API call: ${entityType}`);
const startTime = Date.now();

try {
    const result = await this.externalApiCall();
    const duration = Date.now() - startTime;
    console.log(`[${transactionId}] Completed ${entityType} in ${duration}ms`);
    return result;
} catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${transactionId}] Failed ${entityType} after ${duration}ms:`, error);
    throw error;
}
```

## Performance Optimization Guidelines

### Concurrency Strategy Selection

Choose the appropriate pattern based on operation characteristics:

- **Sequential processing**: Use when external API has strict rate limits or when operations must execute in order
- **Full concurrency**: Only for independent operations against well-scaled internal services
- **Batched processing**: **Recommended** for bulk operations against external APIs or resource-constrained services
- **Parallel with limit**: Use `p-limit` or similar for fine-grained control over concurrency

### Capacity Planning

When integrating external APIs:

1. **Start conservative**: Begin with low concurrency (1-2 requests) and increase gradually
2. **Monitor and adjust**: Watch for timeout patterns indicating capacity limits
3. **Document limits**: Add comments explaining concurrency constraints based on observed behavior
4. **Plan for degradation**: Design endpoints to handle partial failures gracefully

## Database Migrations & Performance

### Pre-Startup Migration System

The API includes a **pre-startup migration system** that runs BEFORE NestJS/TypeORM initializes:

**File:** `src/migration/run-migrations-before-startup.ts`

**Purpose:** Executes critical data migrations that must run before TypeORM initialization (e.g., fixing invalid enum values)

**Features:**

- Creates temporary DataSource connection before NestJS starts
- Runs synchronously during application bootstrap
- Non-blocking - errors are logged but don't prevent startup
- Executed in `main.ts` before `NestFactory.create()`
- Empty by default - add migrations as needed

**Usage Example:**

```typescript
export async function runMigrationsBeforeStartup(): Promise<void> {
    const tempDataSource = new DataSource({
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'pra',
    });

    try {
        await tempDataSource.initialize();

        // Add critical migrations here
        // await migrateSomething(tempDataSource);
    } finally {
        await tempDataSource.destroy();
    }
}
```

**When to Use:**

- Migrations that fix data preventing TypeORM startup (invalid enum values, etc.)
- One-time data transformations that must complete before app starts
- Data fixes for breaking schema changes

---

### Automatic Index Creation

The API includes an **automatic migration system** that runs on startup in production:

**File:** `src/migration/migration.module.ts`

**Purpose:** Creates missing database indexes based on TypeORM entity metadata

**Features:**

- Scans all entity metadata for unique columns, @Index decorators, and foreign keys
- Creates indexes only if they don't already exist (idempotent)
- Runs `ANALYZE TABLE` after index creation for query optimization
- Only runs in production mode (skips when `synchronize: true`)
- Comprehensive logging with transaction IDs

**Configuration:**

- Registered in `AppModule` as global module
- Executes via `OnModuleInit` lifecycle hook
- Safe to run on every deployment

**Documentation:** See `docs/DATABASE_MIGRATIONS.md` for detailed information

### Database Performance Best Practices

1. **Index all foreign keys**: TypeORM doesn't auto-create FK indexes
2. **Index frequently filtered columns**: Status fields, customer IDs, name patterns
3. **Use connection pooling**: Configure appropriate pool size in TypeORM config
4. **Monitor slow queries**: Database logs queries > 1 second
5. **Regular ANALYZE**: Migration system runs this automatically after index creation

---

## Kubernetes Deployment & Stability

### Health Check Endpoints

The API provides **three separate health check endpoints** for proper Kubernetes lifecycle management:

**File:** `src/health/controllers/health.controller.ts`

1. **`GET /health`** - Full health check (database, disk, memory, external API)
    - Use for manual health verification
    - External API check has graceful degradation (doesn't fail health check)

2. **`GET /health/ready`** - Readiness probe (database check only, 3s timeout)
    - Use for Kubernetes readiness probe
    - Removes pod from service if database unavailable
    - Fast response for quick detection

3. **`GET /health/live`** - Liveness probe (lightweight, uptime + memory)
    - Use for Kubernetes liveness probe
    - No external dependencies (doesn't call database or APIs)
    - Prevents false restarts from transient issues

### Graceful Shutdown

**File:** `src/main.ts`

The application implements comprehensive graceful shutdown handlers:

```typescript
- SIGTERM handler: Kubernetes sends this for pod termination
- SIGINT handler: Manual interruption (Ctrl+C)
- SIGUSR2 handler: Nodemon/development restarts
- uncaughtException handler: Logs fatal errors before exit
- unhandledRejection handler: Logs unhandled promise rejections
```

**Features:**

- Logs shutdown signals with emoji indicators for visibility
- 30-second grace period for in-flight requests to complete
- Proper database connection cleanup
- Process exit code logging for diagnostics

### Docker Configuration

**File:** `Dockerfile`

Production-ready multi-stage build:

```dockerfile
- Builder stage: npm ci --only=production for smaller image
- Runtime stage: node:lts-alpine base image
- dumb-init: Proper PID 1 signal handling (fixes npm signal forwarding)
- Non-root user: nodejs:1001 for security
- Built-in HEALTHCHECK: Docker-level health monitoring
- Direct node execution: CMD uses dumb-init + node (not npm start)
```

### Kubernetes Best Practices

**File:** `k8s/deployment.yaml` (reference manifest)

Recommended configuration for production stability:

```yaml
Health Probes:
  - livenessProbe: /health/live, 60s initial delay, 30s period, 3 failures → restart
  - readinessProbe: /health/ready, 30s initial delay, 10s period, 3 failures → remove from service
  - startupProbe: /health/live, 5 minutes total startup time (handles slow migrations)

Resource Limits:
  - requests: 500m CPU, 512Mi memory
  - limits: 2000m CPU, 2Gi memory

Graceful Shutdown:
  - terminationGracePeriodSeconds: 30
  - preStop hook: sleep 15 (ensures deregistration completes)

High Availability:
  - 2 replicas minimum
  - Pod anti-affinity: Spread across nodes
  - PodDisruptionBudget: minAvailable: 1
  - Rolling update: maxUnavailable: 0 (zero-downtime deployments)
```

### Debugging Pod Restarts

**Documentation:** See `docs/HARDENING_GUIDE.md` for comprehensive troubleshooting

Common scenarios:

1. **OOMKilled**: Increase memory limits, check for memory leaks
2. **Health check failures**: Increase timeouts, check database connectivity
3. **Slow startup**: Increase startup probe failure threshold (migrations can take time)
4. **Database connection failures**: Add init container to wait for database
5. **Graceful shutdown issues**: Increase termination grace period, ensure enableShutdownHooks() is called

**Key debugging commands:**

```bash
kubectl logs <pod-name> --previous  # Get logs from crashed pod
kubectl describe pod <pod-name>     # Check events and restart reason
kubectl top pod <pod-name>          # Monitor resource usage
```

---

## Batch Operations & Sync Endpoints

### Sequential Processing Pattern

For endpoints that sync large datasets with external APIs, use **sequential processing** with delays:

**File:** `src/discrepancy/commands/handlers/sync-all-discrepancies.command-handler.ts`

```typescript
// Process items one at a time with delays between calls
for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Log progress every 10 items
    if (i % 10 === 0) {
        console.log(`[${transactionId}] Progress: ${i}/${items.length}`);
    }

    // Process single item
    await this.processItem(item);

    // Delay between calls (except last item)
    if (i < items.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
}
```

**Guidelines:**

- **Use 250ms delays**: Prevents overwhelming external APIs
- **Progress logging**: Log every 10 items for visibility
- **Graceful errors**: Continue processing even if individual items fail
- **Transaction correlation**: Include transaction ID in all logs
- **Return partial results**: Design to return successfully processed items even if some fail

### Retry Logic

**File:** `src/shared/utilities/retry.utility.ts`

For operations that may fail transiently, implement retry logic with exponential backoff:

```typescript
await RetryUtility.withRetry(async () => await this.externalApiCall(), {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    transactionId: query.transactionId,
    context: 'External API call',
});
```

---

## API Documentation Best Practices

### Swagger/OpenAPI as Source of Truth

The API provides comprehensive Swagger documentation at `/open-api` with:

- Required vs optional fields via `@ApiProperty({ required: true/false })`
- Default values via `@ApiProperty({ default: ... })`
- Data types via `@ApiProperty({ type: ... })`
- Enum values via `@ApiProperty({ enum: ... })`
- Detailed descriptions for each field
- Interactive "Try it out" feature with auto-generated examples

### Postman Collection Guidelines

When providing Postman examples:

**Recommended approach:**

- Include **only required fields** in request body examples
- Use generic placeholder values (`"string"`, `0`, `true`, `false`)
- Let engineers refer to Swagger docs for:
    - Optional fields they might want to add
    - Valid enum values and constraints
    - Default behaviors
    - Field descriptions and business rules

**Benefits:**

- ✅ Less clutter - Only shows what's absolutely necessary
- ✅ Forces Swagger usage - Engineers learn to use proper API documentation
- ✅ Less maintenance - Don't need to keep Postman in sync with code changes
- ✅ Clearer intent - Shows minimum needed for successful request
- ✅ Single source of truth - Swagger is automatically generated from code

**Example (minimal Postman body):**

```json
{
    "name": "string",
    "platformType": "windows"
}
```

Engineers who need optional fields can add them by referencing the Swagger documentation.

---

## 📚 Comprehensive Documentation Index

For detailed information beyond this quick reference, consult the comprehensive documentation in `/docs/`:

### Architecture Documentation

- **[System Overview](../docs/architecture/SYSTEM_OVERVIEW.md)** - High-level architecture, data flow patterns, multi-tenancy model, external system integrations
- **[Module Dependencies](../docs/architecture/MODULE_DEPENDENCIES.md)** - Complete module dependency graph, module categories, integration points, load order
- **[CQRS Implementation](../docs/architecture/CQRS_IMPLEMENTATION.md)** - Detailed CQRS patterns with real code examples, commands, queries, events, sagas, workflows
- **[Database Migrations Guide](../docs/DATABASE_MIGRATIONS.md)** - Migration strategies, automatic index creation, performance optimization (if exists)

### Module Documentation

- **[Module Index](../docs/modules/README.md)** - Complete index of all module documentation with quick reference tables
- **[Customer Module](../docs/modules/domain/customer.md)** - Detailed customer module documentation including endpoints, CQRS operations, database schema, workflows, and troubleshooting

**Additional module docs** (to be created as needed):

- User Module
- Site Module
- Team Module
- Jump Group Module
- Jump Items Modules
- Group Policy Modules
- And more...

### Developer Guides

- **[Quick Start Guide](../docs/guides/QUICK_START.md)** - Complete onboarding guide for new developers:
    - Installation and setup
    - Running the application
    - Making your first API call
    - Development workflow
    - Common issues and solutions
- **[Adding New Module Guide](../docs/guides/ADDING_NEW_MODULE.md)** - Step-by-step instructions for creating new modules:
    - Module structure creation
    - CQRS implementation
    - Access control setup
    - Testing strategies
    - Documentation requirements

### Workflow Documentation

**Common workflows** (examples):

- Customer creation workflow (with administrator group policy)
- Site creation workflow (multi-step with external API calls)
- User management workflows (with saga-driven state changes)

### When to Use Which Documentation

| Need                              | Documentation                                                       |
| --------------------------------- | ------------------------------------------------------------------- |
| Understand overall architecture   | [System Overview](../docs/architecture/SYSTEM_OVERVIEW.md)          |
| See how modules interact          | [Module Dependencies](../docs/architecture/MODULE_DEPENDENCIES.md)  |
| Learn CQRS patterns with examples | [CQRS Implementation](../docs/architecture/CQRS_IMPLEMENTATION.md)  |
| Understand specific module        | Module-specific docs in [/docs/modules/](../docs/modules/README.md) |
| Onboard new developer             | [Quick Start Guide](../docs/guides/QUICK_START.md)                  |
| Create new module                 | [Adding New Module Guide](../docs/guides/ADDING_NEW_MODULE.md)      |
| Quick reference for patterns      | This file (copilot-instructions.md)                                 |
| API endpoint reference            | Swagger at `/open-api`                                              |

### Documentation Maintenance

When making changes to the codebase:

- ✅ Update module-specific documentation if API changes
- ✅ Update CQRS examples if patterns evolve
- ✅ Keep quick reference (this file) synchronized with detailed docs
- ✅ Add new module documentation when creating modules
- ✅ Document breaking changes in relevant guides

### Quick Navigation

From any context, GitHub Copilot can:

1. Reference this file for **quick patterns and conventions**
2. Direct to **detailed architecture docs** for deep dives
3. Point to **module docs** for specific implementation details
4. Use **developer guides** for step-by-step workflows

---

Always follow the established module structure and CQRS patterns when adding new features or domains.

---

## Security and Secrets (Critical)

- **Never commit secrets, passwords, API keys, or tokens** to source files or `package.json` scripts.
- The Docker registry password for `shamrock-nexus.cdn-vas.net` must **never** appear in `package.json`.
  Use `bash scripts/docker-login-marlink.sh` which reads from env vars or prompts interactively.
- `docker:login:marlink` in `package.json` must stay as: `"bash scripts/docker-login-marlink.sh"`

### Local Developer Setup (macOS Keychain)

Store the Docker registry password securely and load it automatically:

```bash
# Store once in macOS Keychain
security add-generic-password -a "$USER" -s DOCKER_MARLINK_PASSWORD -w

# Add to ~/.zshrc for auto-loading
export DOCKER_MARLINK_USER="${DOCKER_MARLINK_USER:-shamrock}"
export DOCKER_MARLINK_PASSWORD="${DOCKER_MARLINK_PASSWORD:-$(security find-generic-password -a "$USER" -s DOCKER_MARLINK_PASSWORD -w 2>/dev/null || true)}"
```

Then `npm run publish:api` will log in without ever exposing the password.

### Environment Variables

- Runtime secrets must come from `.env` / `.env.local` / `.local.env` files (all gitignored) or container environment injection.
- Never hardcode connection strings, API keys, or credentials in TypeScript source files.
- `.local.env` is gitignored and safe for local overrides; `.env.local` likewise — do not commit either.

### Docker Publish Flow

```bash
npm run docker:prepare:api   # build + tag
npm run docker:login:marlink # secure login (reads DOCKER_MARLINK_PASSWORD or prompts)
npm run docker:push:api      # push to shamrock-nexus
# or all at once:
npm run publish:api
```

# System Overview

## Introduction

The **Marlink PRA API** is a NestJS-based privilege access management system that integrates with BeyondTrust's PRA (Privileged Remote Access) solution. It provides multi-tenant customer management, role-based access control, and comprehensive user/group/jump resource management.

## Core Purpose

The API serves as a **management layer** between customers and the BeyondTrust PRA system, providing:

1. **Multi-tenant isolation** - Business unit-based customer segregation
2. **Access control** - Granular permission management via access keys
3. **Resource management** - Users, teams, jump groups, jump points, jump items
4. **Site management** - Customer site hierarchies with role-based permissions
5. **Sync operations** - Discrepancy detection and synchronization with BeyondTrust

## Architecture Style

### CQRS (Command Query Responsibility Segregation)

Every domain operation is strictly separated:

- **Commands** - Write operations (Create, Modify, Delete)
- **Queries** - Read operations (Retrieve, Find, List)
- **Events** - Domain events that trigger sagas/workflows
- **Sagas** - Orchestrate complex multi-step workflows

### Domain-Driven Design (DDD)

Each business domain is an independent module with:

- **Domain Models** - Business entities (Customer, User, Site, etc.)
- **Repositories** - Data access with TypeORM entities
- **Controllers** - HTTP endpoints with validation
- **DTOs** - Request/response data transfer objects
- **Workflows** - Complex business processes

### Event-Driven Architecture

- Domain events trigger cross-module workflows
- Example: Customer deactivation → User login disable
- Sagas handle event-to-command conversion

## System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP Layer (REST API)                    │
│                                                               │
│  Controllers (Routing, Validation, Guards, Interceptors)     │
└───────────────────────────┬───────────────────────────────── ┘
                            │
┌───────────────────────────┴───────────────────────────────── ┐
│                   Application Layer (CQRS)                   │
│                                                               │
│  ┌────────────┐        ┌────────────┐        ┌────────────┐ │
│  │  Commands  │        │  Queries   │        │   Events   │ │
│  │  (Write)   │        │  (Read)    │        │  (Notify)  │ │
│  └────────────┘        └────────────┘        └────────────┘ │
└───────────────────────────┬───────────────────────────────── ┘
                            │
┌───────────────────────────┴───────────────────────────────── ┐
│                      Domain Layer                            │
│                                                               │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐ │
│  │   Models    │    │  Workflows   │    │     Sagas       │ │
│  │ (Business)  │    │ (Processes)  │    │ (Orchestration) │ │
│  └─────────────┘    └──────────────┘    └─────────────────┘ │
└───────────────────────────┬───────────────────────────────── ┘
                            │
┌───────────────────────────┴───────────────────────────────── ┐
│                  Data Access Layer                           │
│                                                               │
│  ┌─────────────────┐              ┌─────────────────────┐   │
│  │  Repositories   │              │   External APIs     │   │
│  │   (TypeORM)     │              │  (HTTP Clients)     │   │
│  │                 │              │                     │   │
│  │ - Customers     │              │ - BeyondTrust API   │   │
│  │ - Sites         │              │ - PRA Sync API      │   │
│  │ - Accesses      │              │                     │   │
│  │ - Logs          │              │                     │   │
│  └─────────────────┘              └─────────────────────┘   │
└───────────────────────────┬───────────────────────────────── ┘
                            │
                ┌───────────┴─────────────┐
                │                         │
         ┌──────┴──────┐          ┌──────┴──────────┐
         │  Database   │          │  External APIs  │
         │  (MariaDB)  │          │  (BeyondTrust)  │
         └─────────────┘          └─────────────────┘
```

## Security Architecture

### Multi-Layered Access Control

```
Request → AccessGuard → Scope Interceptors → Request Pipes → Controller → Handler
    ↓          ↓               ↓                    ↓             ↓           ↓
 API Key   Validate Key   Filter Data        Validate Params   Execute   DB/API
           Load BUs       By Scope           Against Scope     Logic     Access
```

### Layer Details

1. **AccessGuard** (Authentication)
    - Validates `X-Access-Key` header
    - Loads Access record with business units
    - Rejects unauthorized requests → 401 Unauthorized

2. **Scope Interceptors** (Data Filtering)
    - `BusinessUnitsScopeInterceptor` - Extracts allowed business units
    - `CustomersScopeInterceptor` - Loads customers by business units
    - `JumpGroupsScopeInterceptor` - Filters jump groups by customer names
    - Rejects empty scopes → 403 Forbidden

3. **Request Pipes** (Parameter Validation)
    - Auto-populates filters for GET requests
    - Validates creation parameters for POST requests
    - Verifies entity access for PATCH/DELETE requests
    - Rejects out-of-scope operations → 403 Forbidden

4. **Controller** (Routing & Orchestration)
    - Routes to appropriate CQRS handler
    - Applies global validation pipes
    - Handles response transformation

5. **Handler** (Business Logic)
    - Command handlers for writes
    - Query handlers for reads
    - Emits domain events
    - Executes business rules

## Data Flow Patterns

### Pattern 1: Local Entity Management (e.g., Customers, Sites)

```
Client Request
      ↓
Controller (with tenant headers)
      ↓
Scope Interceptors (filter by business units)
      ↓
Request Pipe (validate parameters)
      ↓
Command/Query Handler
      ↓
Repository Service (TypeORM)
      ↓
MySQL Database
      ↓
Response to Client
```

### Pattern 2: External API Integration (e.g., Users, Teams, Jump Groups)

```
Client Request
      ↓
Controller (with tenant headers)
      ↓
Scope Interceptors (filter by customers)
      ↓
Request Pipe (validate parameters)
      ↓
Command/Query Handler
      ↓
HTTP Service (with retry logic)
      ↓
BeyondTrust PRA Sync API
      ↓
Transform Response
      ↓
Response to Client
```

### Pattern 3: Hybrid (Local + External) (e.g., Site Creation Workflow)

```
Client Request (Create Site)
      ↓
Controller
      ↓
CreateSiteCommand Handler
      ├─→ Create Site in Database (TypeORM)
      ├─→ Create Jump Group (External API)
      ├─→ Create Jump Policy (External API)
      ├─→ Create Users (External API)
      ├─→ Create Teams (External API)
      └─→ Associate Policies (External API)
      ↓
Emit SiteCreatedEvent
      ↓
Response to Client
```

## Request Lifecycle

### Typical Request Flow

1. **Incoming Request**

    ```
    POST /users
    Headers:
      X-Access-Key: abc123
      X-Tenant-Id: 1
      X-Transaction-Id: uuid-1234
    Body:
      { publicDisplayName: "CustomerA-JohnDoe", ... }
    ```

2. **Global Middleware**
    - Throttle guard (rate limiting, `ThrottlerGuard`)
    - Transaction ID: taken from `X-Transaction-Id`, generated by `AccessGuard` or `MonitoringRequestPipe` when missing
    - The global `TimeoutInterceptor` and `LoggingInterceptor` are not active (commented out in `src/main.ts`); timeouts apply per outbound call, see below

3. **Access Validation**
    - `AccessGuard` validates API key
    - Loads business units for key

4. **Data Scoping**
    - `CustomersScopeInterceptor` queries customers
    - Filters by business units from access key

5. **Parameter Validation**
    - `UserRequestPipe` validates user name contains customer name
    - `ValidationPipe` validates DTO structure

6. **Request Monitoring**
    - `MonitoringRequestPipe` (applied by the controllers that declare it) records the endpoint access through `AddMonitoringRecordCommand`

7. **Command Execution**
    - `CreateUserCommand` handler calls external API
    - Calls to pra-sync-api carry a timeout (see Integration Patterns)

8. **Response**
    - Transform response DTO
    - Return to client with 201 Created

9. **Exception Handling**
    - `AllExceptionsFilter` catches errors
    - Logs to database with transaction ID
    - Returns appropriate HTTP status

## Multi-Tenancy Model

### Business Unit → Customer → Resources

```
Business Unit "BU1"
  ├── Customer "CustomerA"
  │     ├── Sites
  │     │   ├── Site "CustomerA-Vessel1"
  │     │   └── Site "CustomerA-Vessel2"
  │     ├── Users
  │     │   ├── "CustomerA-JohnDoe"
  │     │   └── "CustomerA-JaneSmith"
  │     ├── Teams
  │     │   ├── "CustomerA-Admins"
  │     │   └── "CustomerA-Managers"
  │     ├── Jump Groups
  │     │   ├── "CustomerA-Production"
  │     │   └── "CustomerA-Development"
  │     └── Jumpoints
  │         └── "JPOI-CustomerA-001"
  │
  └── Customer "CustomerB"
        └── (similar resource hierarchy)

Business Unit "BU2"
  └── Customer "CustomerC"
        └── (similar resource hierarchy)
```

### Access Key Scoping

```
Access Key "key-123"
  └── value.businessUnits: ["BU1", "BU2"]
      └── Can access: CustomerA, CustomerB, CustomerC
          └── Can manage their users, sites, teams, etc.

Access Key "key-456"
  └── value.businessUnits: ["BU1"]
      └── Can access: CustomerA, CustomerB only
          └── Limited to BU1 resources
```

## External System Integration

### BeyondTrust PRA Sync API

**Base URL**: Configured via `PRA_SYNC_API_BASE_URL`

**Endpoints Used**:

- `/users` - User management
- `/teams` - Team management
- `/jump-groups` - Jump group management
- `/jumpoints` - Jumpoint management
- `/jump-items/remote-rdps` - RDP connections
- `/jump-items/remote-vncs` - VNC connections
- `/jump-items/web-jumps` - Web jumps
- `/jump-items/shell-jumps` - SSH jumps
- `/jump-items/protocol-tunnel-jumps` - Protocol tunnels
- `/group-policies` - Group policy management
- `/jump-policies` - Jump policy management
- `/jump-clients` - Jump client management

**Integration Patterns**:

- HTTP connection pooling (50 max sockets)
- Retry logic for transient failures (`RetryUtility`)
- Batched processing for bulk operations (250ms delays)
- Timeouts: default 300 s for every outbound call, longer values for scans, file transfers and downloads (`AppConfigService.praSyncApiTimeouts`, set at bootstrap by `OutboundHttpModule`, see [Module Dependencies](./MODULE_DEPENDENCIES.md)). A timeout answers 504. A timeout after a write means the outcome is unknown: report it, never repeat the write automatically.
- Graceful error handling (404 returns empty arrays for optional resources)

### Database (MariaDB/MySQL)

**Key Tables**:

- `pra_customers` - Customer definitions
- `pra_sites` - Site hierarchies
- `pra_site_managers`, `pra_site_approvers`, `pra_site_auditors`, `pra_site_support_team_members` - Site roles
- `pra_access` - Access keys with business units
- `beyondtrust_instances` - BeyondTrust instance configurations (shared with pra-sync-api)
- `pra_user` - PRA admin accounts
- `pra_logs` - System log (shared with pra-sync-api; written asynchronously through a bounded buffer by `LogService`)
- `pra_monitorings` - Endpoint access tracking (written through `MonitoringRecordWriterService`)

pra-sync-api owns the shared base schema; see [Database Migrations](../DATABASE_MIGRATIONS.md).

**Connection Management**:

- Retry attempts: 60 (8 seconds between retries)
- Max query execution time: 15 seconds
- TypeORM `synchronize` is on whenever `ENV` is not `production` or `prod`
- Hand-written pre-startup scripts (`src/migration/scripts/`) run before Nest starts; missing indexes are created on startup in production

## Scalability Considerations

### Horizontal Scaling

- **Stateless API** - No session storage, fully stateless
- **Database connection pooling** - Configurable pool size
- **HTTP connection pooling** - Reuses connections to external APIs
- **Kubernetes-ready** - Graceful shutdown, health checks

### Performance Optimizations

- **Automatic database indexes** - Created on startup for FK columns
- **Query optimization** - 15s max execution time enforcement
- **Rate limiting** - 1500 requests per minute (configurable)
- **Batched processing** - Prevents API overload during bulk operations

### Monitoring & Observability

- **Transaction IDs** - Correlate requests across services
- **Exception logging** - 5xx errors logged to the system log (`AllExceptionsFilter`)
- **Endpoint monitoring** - Track all API calls for analytics
- **Health checks** - Separate liveness/readiness probes

## Configuration Management

### Environment Variables

Configuration via environment variables (excerpt):

**Database**:

- `DB_TYPE`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`

**Authentication**:

- `PRA_API_KEY` - Global API key (`X-API-Key`)
- `JWT_SECRET`, `JWT_EXPIRY` - JWT configuration
- The fallback admin (emergency access) is configured only through the defaults in `DefaultAppConfig`, not through environment variables

**External APIs**:

- `PRA_SYNC_API_BASE_URL` - BeyondTrust sync API
- `BEYONDTRUST_CONSOLE_URL` - BT console URL

**Features**:

- `THROTTLE_IS_ENABLED`, `THROTTLE_TTL_IN_MS`, `THROTTLE_LIMIT` - Rate limiting
- `ENV` - Environment (production/development)

**Monitoring**:

- `HEALTH_PING_CHECK_PRA_SYNC_API_URL` - External health check

### Default Configuration

Read through `AppConfigService`: environment variable first, then `src/app-config/consts/default-app-config.const.ts`. The local environment file is `environments/.env`. See [Quick Start](../guides/QUICK_START.md).

## Design Principles

### 1. **Separation of Concerns**

- HTTP layer (controllers) separate from business logic (handlers)
- Read operations (queries) separate from write operations (commands)
- Domain logic separate from infrastructure

### 2. **Fail-Secure**

- Multi-layered access control
- Explicit scope validation at each layer
- Reject by default (whitelist approach)

### 3. **Observable**

- Transaction IDs for request correlation
- Comprehensive exception logging
- Endpoint access tracking

### 4. **Resilient**

- Retry logic for transient failures
- Timeout protection
- Graceful degradation (health checks)
- Graceful shutdown (Kubernetes lifecycle)

### 5. **Maintainable**

- Consistent module structure
- CQRS pattern enforcement
- Comprehensive documentation
- Type-safe TypeScript

## Related Documentation

- [Module Dependencies](./MODULE_DEPENDENCIES.md) - Module relationships
- [CQRS Implementation](./CQRS_IMPLEMENTATION.md) - Command/Query patterns
- [Database Migrations](../DATABASE_MIGRATIONS.md) - Schema scripts and indexes
- [Quick Start](../guides/QUICK_START.md) - Local setup and configuration
- [AGENTS.md](../../AGENTS.md) - Repository rules (boundaries, CQRS, tenant safety)

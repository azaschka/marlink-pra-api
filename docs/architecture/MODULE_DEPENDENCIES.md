# Module Dependencies

This document provides a comprehensive overview of all NestJS modules in the PRA API and their dependencies.

## Module Dependency Graph

```
AppModule (Root)
├── Core Infrastructure
│   ├── TypeOrmModule (Database)
│   ├── CqrsModule (Command/Query separation)
│   ├── ThrottlerModule (Rate limiting)
│   ├── HttpModule (External API calls)
│   ├── OutboundHttpModule (default timeout of every outbound call)
│   └── ObservabilityModule (global: resource report, health contributors)
│
├── Foundation Modules
│   ├── AppConfigModule ──────────────┐
│   ├── MigrationModule               │ (Used by most modules)
│   └── AuthModule                    │
│                                     │
├── Access Control                    │
│   └── AccessModule ◄────────────────┤
│                                     │
├── Monitoring & Health               │
│   ├── HealthModule                  │
│   ├── LogModule                     │
│   └── MonitoringModule              │
│                                     │
├── Domain Modules (Multi-tenant)     │
│   │                                 │
│   ├── CustomerModule ◄──────────────┤
│   │   ├── Has: CustomersScopeInterceptor
│   │   └── Triggers: Customer deactivation saga
│   │                                 │
│   ├── SiteModule ◄──────────────────┤
│   │   ├── Depends on: CustomersScopeInterceptor
│   │   └── Sub-entities: Managers, Auditors, Support Team
│   │                                 │
│   ├── UserModule ◄──────────────────┤
│   │   └── Depends on: CustomersScopeInterceptor
│   │                                 │
│   ├── TeamModule ◄──────────────────┤
│   │   └── Depends on: CustomersScopeInterceptor
│   │                                 │
│   ├── TeamUserModule ◄──────────────┤
│   │                                 │
│   ├── JumpGroupModule ◄─────────────┤
│   │   ├── Depends on: CustomersScopeInterceptor
│   │   └── Provides: JumpGroupsScopeInterceptor
│   │                                 │
│   ├── JumpointModule ◄──────────────┤
│   │   ├── Depends on: CustomersScopeInterceptor
│   │   └── Sub-resources: Nodes, Installers
│   │                                 │
│   ├── JumpClientModule ◄────────────┤
│   │   ├── Depends on: CustomersScopeInterceptor + JumpGroupsScopeInterceptor
│   │   └── Sub-resources: Installers, Platforms
│   │                                 │
│   ├── JumpItemModule (Composite) ◄──┤
│   │   ├── RemoteRdpModule           │
│   │   ├── RemoteVncModule           │
│   │   ├── WebJumpModule             │
│   │   ├── ShellJumpModule           │
│   │   └── ProtocolTunnelJumpModule  │
│   │       (All depend on CustomersScopeInterceptor + JumpGroupsScopeInterceptor)
│   │                                 │
│   ├── JumpPolicyModule ◄────────────┤
│   │                                 │
│   ├── GroupPolicyModule ◄───────────┤
│   │   └── Depends on: CustomersScopeInterceptor
│   │                                 │
│   ├── GroupPolicyJumpGroupModule ◄──┤
│   │                                 │
│   ├── GroupPolicyJumpointModule ◄───┤
│   │                                 │
│   ├── GroupPolicyMemberModule ◄─────┤
│   │                                 │
│   ├── GroupPolicyTeamModule ◄───────┤
│   │                                 │
│   └── UserGroupPolicyModule ◄───────┤
│                                     │
├── External System Integration       │
│   ├── BeyondtrustInstanceModule ◄───┤
│   │   └── No tenant scoping (admin only)
│   ├── BeyondtrustInstanceBackupModule
│   └── DiscrepancyModule ◄───────────┘
│       └── Sync operations with external API
│
├── Business Logic Support
│   ├── EmailModule
│   │   └── Handles MJML templates
│   ├── JobModule
│   │   └── Cron job management
│   ├── RetentionModule
│   │   └── Hourly retention of pra_logs and pra_monitorings
│   └── LicenseUsageModule
│
└── Utilities
    └── Core utilities (shared across all modules)
```

## Module Categories

### 1. Core Infrastructure Modules

These are foundational NestJS modules that provide system-wide functionality:

- **TypeOrmModule**: Database connection and entity management
- **CqrsModule**: Command Query Responsibility Segregation pattern
- **ThrottlerModule**: Global rate limiting (1500 requests per minute)
- **HttpModule**: HTTP client for external API calls
- **OutboundHttpModule**: sets the default timeout (`PRA_SYNC_API_TIMEOUT_IN_MS`, 300 s) on the shared axios instance of the plain `HttpModule` at bootstrap. Long-running calls pass their own timeout (`AppConfigService.praSyncApiTimeouts`): manual scan and "sync all external" 25 min, backup creation and jumpoint node ISO download 30 min. Installer downloads fail after 120 s without data (`SyncApiDownloadUtility`). A timeout answers `504`.
- **ObservabilityModule** (global): `ResourceReporterService` writes one JSON line (`ResourceReport` logger) every `RESOURCE_REPORT_INTERVAL_IN_MS` (5 min, 0 disables it) with heap, RSS, repository cache, pool figures and the figures that modules register through `ResourceReportRegistry` (`logWriter`, `monitoringWriter`, `manualScans`). `HealthContributorRegistry` collects the diagnostic checks that modules contribute (`praSyncApi`, `retention`).

### 2. Foundation Modules

#### AppConfigModule

- **Purpose**: Centralized configuration management via environment variables
- **Used By**: Almost all modules
- **Key Features**:
    - Database config
    - Auth config (API keys, JWT, fallback admin)
    - External API URLs
    - Feature toggles (throttling, etc.)

#### MigrationModule

- **Purpose**: Database migrations before app startup
- **Features**:
    - Pre-startup migrations (`runMigrationsBeforeStartup`)
    - Automatic index creation on startup
    - Idempotent operations
- **Load Order**: Loaded early in `AppModule`; the pre-startup scripts run before Nest starts, see [Database Migrations](../DATABASE_MIGRATIONS.md)

#### AuthModule

- **Purpose**: Authentication and JWT token management
- **Strategies**:
    - `ApiKeyStrategy`: API key validation
    - `JwtStrategy`: JWT token validation
    - `LocalStrategy`: Username/password authentication
- **Features**: Fallback admin authentication for DB outages

### 3. Access Control Module

#### AccessModule

- **Purpose**: Business unit-based access control
- **Database**: `pra_accesses` table
- **Key Features**:
    - Stores access keys with associated business units
    - Provides `AccessGuard` for validation
    - No tenant scoping (global admin management)

### 4. Monitoring & Health Modules

#### HealthModule

- **Endpoints**:
    - `/health` - Diagnostic contract: legacy Terminus fields plus `overallStatus` (`healthy`, `degraded`, `unavailable`), `service`, `version`, `checkedAt` and `checks.<name>` (`status` up, warning or down, `critical`, measured values). HTTP 503 only when the database is down or the service shuts down.
    - `/health/ready` - Readiness probe (database only, 503 when it is down)
    - `/health/live` - Liveness probe (no external deps)
- **Features**: `praSyncApi` is non-critical (a Sync API warning or outage makes PRA API `degraded`, never 503) and understands old and new Sync answers; database, storage and Sync checks are bounded and cached; `memoryHeap` warns on sustained usage (minimum over 300 s). Health requests are not recorded as monitoring records.

#### MonitoringModule

- **Purpose**: Track all endpoint access for analytics
- **Database**: `pra_monitorings` table
- **Pipe**: `MonitoringRequestPipe` queues one record per request through a bounded asynchronous writer; it never waits for the database

#### LogModule

- **Purpose**: System log of commands, events and server errors
- **Database**: `pra_logs` table (shared with pra-sync-api, identical `LogEntity` in both services)
- **Features**:
    - `LogBusSubscriberService` (singleton) subscribes to the command and event buses once per process.
    - `LogWriterService` writes through `BufferedEntityWriter`: bounded buffer, multi-row INSERTs, at most one statement in flight, backoff; under overload rows are dropped, counted and documented by a `LOG_ENTRIES_DROPPED` entry; shutdown is bounded.
    - Secrets are redacted before persisting (deny-list in `LogService`, any depth).
    - `AllExceptionsFilter` responds first, then queues the entry; health responses and raw database connection failures go to stdout only.

### 5. Domain Modules (Multi-Tenant)

#### CustomerModule

- **Purpose**: Customer/tenant management
- **Database**: `pra_customers` table
- **Scoping**: Business unit-based (`BusinessUnitsScopeInterceptor`)
- **Saga**: `CustomerSaga` - Triggers user login disable on deactivation
- **Provides**: `CustomersScopeInterceptor` for child modules
- **Access Pattern**:
    ```
    X-Access-Key → BusinessUnitsScopeInterceptor → Filter by business units
    ```

#### SiteModule

- **Purpose**: Site management with role-based access
- **Database**:
    - `pra_sites`
    - `pra_site_managers`
    - `pra_site_auditors`
    - `pra_site_support_team_members`
    - `pra_site_approvers`
- **Scoping**: Customer-based
- **Controllers**: Separate controllers for each role type
- **Access Pattern**:
    ```
    X-Access-Key → CustomersScopeInterceptor → Filter by customer names
    ```

#### UserModule

- **Purpose**: BeyondTrust user management
- **External API**: Calls BeyondTrust PRA Sync API
- **Scoping**: Customer-based (name must contain customer name)
- **Pipe**: `UserRequestPipe` validates customer access
- **Access Pattern**:
    ```
    X-Access-Key → CustomersScopeInterceptor → UserRequestPipe → Filter by customer names
    ```

#### TeamModule

- **Purpose**: Team management in BeyondTrust
- **External API**: Calls BeyondTrust PRA Sync API
- **Scoping**: Customer-based (name must contain customer name)
- **Access Pattern**: Same as UserModule

#### JumpGroupModule

- **Purpose**: Jump group management
- **External API**: Calls BeyondTrust PRA Sync API
- **Scoping**: Customer-based (name must contain customer name)
- **Provides**: `JumpGroupsScopeInterceptor` for jump items
- **Access Pattern**:
    ```
    X-Access-Key → CustomersScopeInterceptor → JumpGroupRequestPipe → Filter by customer names
    ```

#### JumpointModule

- **Purpose**: Jumpoint management
- **External API**: Calls BeyondTrust PRA Sync API
- **Scoping**: Customer-based (name must contain customer name)
- **Sub-resources**:
    - Nodes (`/nodes`)
    - Installers (`/installer`)
- **Access Pattern**: Same as UserModule

#### JumpClientModule

- **Purpose**: Jump client management
- **Scoping**: Jump group-based
- **Access Pattern**:
    ```
    X-Access-Key → CustomersScopeInterceptor → JumpGroupsScopeInterceptor → Filter by jump group IDs
    ```

#### JumpItemModule (Composite)

- **Purpose**: Container for all jump item types
- **Sub-modules**:
    - `RemoteRdpModule` - RDP connections
    - `RemoteVncModule` - VNC connections
    - `WebJumpModule` - Web-based jumps
    - `ShellJumpModule` - SSH/shell jumps
    - `ProtocolTunnelJumpModule` - Protocol tunnels
- **Scoping**: All sub-modules are jump group-based
- **Access Pattern**: Same as JumpClientModule

#### GroupPolicyModule & Related

- **Core**: `GroupPolicyModule` - Group policy management
- **Association Modules**:
    - `GroupPolicyJumpGroupModule` - Associates group policies with jump groups
    - `GroupPolicyJumpointModule` - Associates group policies with jumpoints
    - `GroupPolicyMemberModule` - Member management
    - `GroupPolicyTeamModule` - Team associations
    - `UserGroupPolicyModule` - User associations
- **Scoping**: Customer-based (name must contain customer name)

#### TeamUserModule

- **Purpose**: Associate users with teams
- **External API**: Calls BeyondTrust PRA Sync API

#### JumpPolicyModule

- **Purpose**: Jump policy management
- **External API**: Calls BeyondTrust PRA Sync API

### 6. External System Integration

#### BeyondtrustInstanceModule

- **Purpose**: Manage BeyondTrust instance configurations
- **Database**: `pra_beyondtrust_instances` table
- **Scoping**: None (admin-only endpoints)
- **Features**: Stores BT instance URLs and credentials

#### BeyondtrustInstanceBackupModule

- **Purpose**: Backup BeyondTrust instance configurations
- **Database**: `pra_beyondtrust_instance_backups` table
- **Cron Job**: Automatic backups at 02:35 AM daily

#### DiscrepancyModule

- **Purpose**: Sync discrepancies between DB and BeyondTrust API
- **Features**:
    - Scan all entities for discrepancies: `ScanAllDiscrepanciesCommand` starts `ManualDiscrepancyScanService` in the background, one manual scan per tenant; the status (`RetrieveDiscrepancyScanStatusQuery`) is per tenant, kept 1 h, at most 200, with `failedEntityTypes`. After a Sync API timeout the remaining types are not attempted.
    - Overviews carry the optional `state` and `failureKind` of the Sync API (3.2 and later)
    - Sync operations with batched processing
    - 250ms delays between API calls

#### SocModule

- **Purpose**: Consolidated, read-only SOC projections for the SOC integration (`/soc`), enriched at runtime from existing customer and site data
- **Scoping**: `CustomersScopeInterceptor`, `SocRequestPipe`
- **Notes**: Query handlers only; `SocAggregateCacheService` caches aggregates (`SOC_CACHE_TTL_IN_MS`); no schema of its own

#### SessionPolicyModule

- **Purpose**: Session policies, proxied to pra-sync-api (`/session-policies`)
- **Scoping**: `CustomersScopeInterceptor`, `SessionPolicyRequestPipe`

#### DeploymentModule

- **Purpose**: Container for deployment features; currently `JumpointNodeModule` (`/deployments/jumpoint-nodes`), which forwards to pra-sync-api (Marlink Service Manager) and adds access control and Business Unit scoping
- **Details**: [jumpoint node deployment](../../../docs/knowledge/domains/jumpoint-node-deployment.md)

### 7. Business Logic Support

#### EmailModule

- **Purpose**: Email sending via SMTP
- **Template Engine**: MJML + Handlebars
- **Templates**: Located in `src/email/templates/`

#### JobModule

- **Purpose**: Cron job management
- **Jobs**:
    - BeyondTrust instance backup (daily at 02:35 AM)
    - BT data population if empty (every 3 hours)
    - Retention (`CRON_JOB_LOG_RETENTION`, default `17 * * * *`): dispatches `EnforceRetentionCommand`

#### RetentionModule

- **Purpose**: no row of `pra_logs` or `pra_monitorings` older than `LOG_RETENTION_DAYS` / `MONITORING_RETENTION_DAYS` (90) plus at most 2 hours
- **Mechanism**: `RetentionService` deletes in batches of 5,000 rows (`BatchedDeleteUtility`, 100 ms pause, at most 10 min per table and run), never twice at the same time (in process and `GET_LOCK('pra:retention:<table>', 0)`, switch `RETENTION_DISTRIBUTED_LOCK_ENABLED`, off on Galera), one summary line per run, backlog reported as the non-critical check `retention`

#### LicenseUsageModule

- **Purpose**: License usage tracking and reporting

#### MaintenanceModule

- **Purpose**: Destructive data reset (`POST /maintenance/reset-data`, hidden from Swagger), with a preview of the affected tables
- **Access**: `ApiKeyAuthGuard`, `JwtAuthGuard` and `ResetAuthorizationGuard` (allow-list `RESET_ALLOWED_USERNAMES`)

## Access Control Flow

### Level 1: AccessGuard

```typescript
@UseGuards(AccessGuard)
```

- Validates `X-Access-Key` header
- Loads Access record with business units
- Stores in `request.authInfo.access`

### Level 2: Scope Interceptors

#### BusinessUnitsScopeInterceptor (Customer Module)

```typescript
@UseInterceptors(BusinessUnitsScopeInterceptor)
```

- Extracts business units from access key
- Validates business units exist
- Stores in `request.businessUnits`

#### CustomersScopeInterceptor (Most Domain Modules)

```typescript
@UseInterceptors(CustomersScopeInterceptor)
```

- Queries customers by business units
- Validates at least one customer exists
- Stores in `request.customers`

#### JumpGroupsScopeInterceptor (Jump Item Modules)

```typescript
@UseInterceptors(CustomersScopeInterceptor, JumpGroupsScopeInterceptor)
```

- Queries all jump groups from external API
- Filters by customer name matching
- Stores in `request.jumpGroups`

### Level 3: Request Pipes

Each domain module has a request pipe that:

- **GET requests**: Auto-populates filters with allowed scope
- **POST requests**: Validates entity belongs to allowed scope
- **PATCH/DELETE requests**: Queries entity and validates scope

**Examples**:

- `CustomerRequestPipe` - Validates business unit access
- `UserRequestPipe` - Validates user name contains customer name
- `JumpClientRequestPipe` - Validates jump client belongs to allowed jump groups

## Module Load Order

1. **TypeOrmModule** - Database connection
2. **CqrsModule** - CQRS infrastructure
3. **ThrottlerModule** - Rate limiting
4. **HttpModule** - HTTP client
5. **MigrationModule** ⚠️ **Must load early**
6. **AuthModule** - Authentication
7. **HealthModule** - Health checks
8. **AccessModule** - Access control
9. **Domain modules** - Order doesn't matter (independent)
10. **Utility modules** - Email, Jobs, Logs, Monitoring

## Key Dependencies

### Shared by Most Modules

- `AppConfigModule` - Configuration
- `AccessGuard` - Access validation
- `CustomersScopeInterceptor` - Customer filtering
- Domain-specific `RequestPipe` - Parameter validation

### Module-Specific Dependencies

| Module                    | Unique Dependencies                              |
| ------------------------- | ------------------------------------------------ |
| CustomerModule            | `BusinessUnitsScopeInterceptor`, `CustomerSaga`  |
| SiteModule                | TypeORM entities for managers/auditors/approvers |
| JumpItemModule            | `JumpGroupsScopeInterceptor`                     |
| BeyondtrustInstanceModule | No tenant scoping                                |
| DiscrepancyModule         | Batched processing utilities                     |

## Integration Points

### Database

- **TypeORM** for local entities (customers, sites, accesses, etc.)
- **Migration system** for schema changes and index creation

### External APIs

- **BeyondTrust PRA Sync API** for user/team/jump management
- **HTTP module** with connection pooling (50 sockets)
- **Timeouts**: default and overrides set by `OutboundHttpModule` (see Core Infrastructure Modules)
- **Retry logic** via `RetryUtility`

### Event-Driven Communication

- **Customer deactivation** → Triggers user login disable via saga
- **CQRS events** for cross-module workflows

## Naming Conventions

### Entities

- Database tables: `pra_*` prefix (e.g., `pra_customers`)
- TypeORM entities: `*Entity` suffix (e.g., `CustomerEntity`)

### Modules

- Domain modules: `*Module` suffix (e.g., `CustomerModule`)
- Composite modules contain sub-modules (e.g., `JumpItemModule`)

### Access Control

- Entities must contain customer name for proper scoping
- Jump groups must contain customer name
- Business units directly linked to customers

## Adding New Modules

When adding a new domain module, consider:

1. **Scoping requirements**:
    - Business unit-based? Use `BusinessUnitsScopeInterceptor`
    - Customer-based? Use `CustomersScopeInterceptor`
    - Jump group-based? Use both `CustomersScopeInterceptor` + `JumpGroupsScopeInterceptor`

2. **Access control**:
    - Add `AccessGuard` to controller
    - Create domain-specific `RequestPipe`
    - Implement GET/POST/PATCH/DELETE validation

3. **CQRS pattern**:
    - Create commands for write operations
    - Create queries for read operations
    - Register handlers in module providers

4. **External API integration**:
    - Use `HttpModule` with connection pooling
    - Implement retry logic for transient failures
    - Use batched processing for bulk operations

See [ADDING_NEW_MODULE.md](../guides/ADDING_NEW_MODULE.md) for step-by-step instructions.

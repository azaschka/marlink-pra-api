# Marlink PRA API

## 🎯 Overview

The Marlink PRA API provides comprehensive management capabilities for BeyondTrust Privileged Remote Access (PRA) infrastructure, enabling:

- **Multi-tenant Customer Management** with business unit isolation
- **User & Team Administration** with role-based access control
- **Jump Client & Group Configuration** for secure remote access
- **Site & Jumpoint Management** for distributed infrastructure
- **Group Policy Enforcement** across multiple environments
- **License Usage Tracking** and compliance reporting
- **Automated Discrepancy Resolution** between systems

## 🏗️ Architecture

This API follows **Domain-Driven Design** principles with **CQRS** (Command Query Responsibility Segregation) pattern implementation:

```
┌─────────────────────────────────────────────────────────┐
│                    API Layer (REST)                      │
│          Controllers → Guards → Interceptors → Pipes     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    CQRS Layer                            │
│     Commands (Write) ←→ Events ←→ Queries (Read)       │
│              ↓                        ↓                  │
│           Handlers                 Handlers              │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│               Domain Layer (Business Logic)              │
│     Entities → Repositories → Workflows → Sagas          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│               Infrastructure Layer                       │
│    TypeORM → MySQL/MariaDB    |    BeyondTrust API      │
└─────────────────────────────────────────────────────────┘
```

### Key Design Patterns

- **CQRS**: Strict command/query separation for scalability
- **Event Sourcing**: Domain events drive complex workflows
- **Repository Pattern**: Clean data access abstraction
- **Saga Pattern**: Orchestrate cross-domain workflows
- **Multi-layer Security**: Guards → Interceptors → Pipes for defense in depth

## 📚 Documentation

Comprehensive documentation is available in the `/docs` folder:

### 🏛️ Architecture Documentation

- **[System Overview](docs/architecture/SYSTEM_OVERVIEW.md)** - High-level architecture, data flow, multi-tenancy model
- **[Module Dependencies](docs/architecture/MODULE_DEPENDENCIES.md)** - Complete module dependency graph
- **[CQRS Implementation](docs/architecture/CQRS_IMPLEMENTATION.md)** - Detailed CQRS patterns with examples

### 👨‍💻 Developer Guides

- **[Quick Start Guide](docs/guides/QUICK_START.md)** - Complete onboarding for new developers
- **[Adding New Module Guide](docs/guides/ADDING_NEW_MODULE.md)** - Step-by-step module creation
- **[Database Migrations](docs/DATABASE_MIGRATIONS.md)** - Migration strategies & performance

## 🔧 Technology Stack

| Category           | Technologies                              |
| ------------------ | ----------------------------------------- |
| **Framework**      | NestJS v10+, TypeScript 5.x               |
| **Architecture**   | CQRS (@nestjs/cqrs), Domain-Driven Design |
| **Database**       | TypeORM 0.3.x, MySQL/MariaDB              |
| **Authentication** | JWT, API Key, Passport.js                 |
| **API Docs**       | Swagger/OpenAPI                           |
| **Email**          | MJML templates, Handlebars                |
| **External API**   | BeyondTrust PRA Sync API, Axios           |
| **Security**       | Bcrypt, Helmet, Rate Limiting (Throttler) |
| **Container**      | Docker, Kubernetes-ready                  |
| **Testing**        | Jest (unit + e2e)                         |
| **Code Quality**   | ESLint, Prettier                          |

## 🛠️ Development

### Available Scripts

```bash
# Development with hot-reload
npm run start:dev

# Debug mode
npm run start:debug

# Production build
npm run build
npm run start:prod

# Testing
npm run test              # Unit tests
npm run test:e2e          # End-to-end tests
npm run test:cov          # Coverage report

# Database
npm run db:start:local    # Start MariaDB container
npm run db:stop:local     # Stop MariaDB container

# Code quality
npm run lint              # Run ESLint
npm run format            # Run Prettier

# Docker
npm run docker:build:api  # Build Docker image
npm run publish:api       # Full build & push pipeline
```

### Project Structure

```
pra-api/
├── src/
│   ├── customer/         # Customer domain module
│   ├── user/             # User management module
│   ├── site/             # Site management module
│   ├── team/             # Team management module
│   ├── jump-group/       # Jump group configuration
│   ├── jump-item/        # Jump items (RDP, VNC, etc.)
│   ├── jumpoint/         # Jumpoint management
│   ├── group-policy/     # Policy enforcement
│   ├── access/           # Access control & permissions
│   ├── auth/             # Authentication & authorization
│   ├── health/           # Health checks & monitoring
│   ├── shared/           # Shared utilities & helpers
│   └── ...
├── docs/                 # Comprehensive documentation
├── postman/              # Postman collections & environments
└── test/                 # E2E test suite
```

## 🔐 Security

### Multi-Layer Access Control

The API implements defense-in-depth security:

1. **AccessGuard**: Validates `X-Access-Key` header
2. **Scope Interceptors**: Filter data by business unit/customer
3. **Request Pipes**: Validate entity ownership and permissions

### Authentication Methods

- **API Key**: For service-to-service communication
- **JWT**: For user sessions with token-based auth
- **Fallback Admin**: Emergency access with bcrypt-hashed credentials

### Data Isolation

- **Business Unit Scoping**: Users can only access assigned business units
- **Customer Filtering**: Automatic filtering based on access permissions
- **Jump Group Isolation**: Entity naming conventions enforce boundaries

See [System Overview](docs/architecture/SYSTEM_OVERVIEW.md) for detailed security architecture.

## 📊 API Documentation

Interactive API documentation is available at:

```
http://localhost:3000/open-api
```

Features:

- Complete endpoint reference with request/response schemas
- Interactive "Try it out" functionality
- Authentication header documentation
- DTO validation rules and examples

## 🧪 Testing

```bash
# Run all unit tests
npm run test

# Run with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e

# Watch mode for TDD
npm run test:watch
```

**Coverage Goals**: Aim for >80% coverage on business logic (commands, queries, workflows).

## 📈 Monitoring & Observability

### Built-in Monitoring

- **Endpoint Tracking**: All API calls logged to `pra_monitorings` table
- **Transaction IDs**: Request correlation via `X-Transaction-Id` header
- **Exception Logging**: Comprehensive error logging with stack traces
- **Health Endpoints**: Database, memory, disk, and external API checks

### Monitoring Endpoints

```bash
GET /health          # Full system health
GET /health/ready    # Readiness probe (database)
GET /health/live     # Liveness probe (lightweight)
GET /monitorings     # Endpoint usage analytics
```

# Quick Start Guide

Welcome to the Marlink PRA API! This guide will help you get up and running quickly.

## 🚀 Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 8+
- **MariaDB/MySQL** 10.5+ (or Docker for local development)
- **Git** for version control

## 📦 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd pra-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# Environment
ENV=development

# Server
PORT=9000

# Database
DB_TYPE=mariadb
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your-password
DB_NAME=pra

# Authentication
PRA_API_KEY=your-api-key-here
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRY=24h

# Fallback Admin (Emergency Access)
AUTH_FALLBACK_ADMIN_ENABLED=false
AUTH_FALLBACK_ADMIN_USERNAME=
AUTH_FALLBACK_ADMIN_PASSWORD_HASH=

# External API
PRA_SYNC_API_BASE_URL=http://localhost:9001
BEYONDTRUST_CONSOLE_URL=https://your-instance.beyondtrustcloud.com

# Email (Optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password

# Throttling
THROTTLE_IS_ENABLED=true
THROTTLE_TTL_IN_MS=60000
THROTTLE_LIMIT=1500
```

### 4. Start Local Database

Using Docker:

```bash
npm run db:start:local
```

Or manually start MariaDB on port 3306.

### 5. Run Migrations

Migrations run automatically on startup, but you can verify:

```bash
# Migrations are executed in main.ts before NestFactory.create()
npm run start:dev
```

The automatic migration system will:

- Run pre-startup migrations (if any)
- Create missing indexes based on TypeORM entities
- Run `ANALYZE TABLE` for query optimization

## 🏃 Running the Application

### Development Mode (Watch Mode)

```bash
npm run start:dev
```

Application will be available at `http://localhost:9000`

### Debug Mode

```bash
npm run start:debug
```

Attach debugger on port 9229

### Production Mode

```bash
npm run build
npm run start:prod
```

## 📚 API Documentation

Once running, access Swagger documentation at:

```
http://localhost:9000/open-api
```

**Features**:

- Interactive API explorer
- Request/response schemas
- "Try it out" functionality
- Complete endpoint documentation

## 🧪 Running Tests

### Unit Tests

```bash
npm run test
```

### End-to-End Tests

```bash
npm run test:e2e
```

### Coverage Report

```bash
npm run test:cov
```

Coverage reports are generated in `coverage/` directory.

## 🔐 Authentication

The API uses multiple authentication strategies:

### 1. API Key Authentication (Most Endpoints)

Add header to requests:

```bash
X-Access-Key: your-api-key
```

### 2. JWT Authentication (Alternative)

```bash
# Login to get JWT token
POST /auth/login
{
  "username": "your-username",
  "password": "your-password"
}

# Use token in subsequent requests
Authorization: Bearer <jwt-token>
```

### 3. Fallback Admin (Emergency Access)

Configured via environment variables - see Emergency Access section below.

## 🎯 Your First API Call

### Example: Retrieve Health Status

```bash
curl -X GET http://localhost:9000/health
```

Expected response:

```json
{
    "status": "ok",
    "info": {
        "database": { "status": "up" },
        "disk": { "status": "up" },
        "memory": { "status": "up" }
    }
}
```

### Example: Create a Customer (Business Unit Scoped)

```bash
curl -X POST http://localhost:9000/customers \
  -H "Content-Type: application/json" \
  -H "X-Access-Key: your-api-key" \
  -H "X-Transaction-Id: $(uuidgen)" \
  -d '{
    "key": "CUST001",
    "name": "Acme Corporation",
    "businessUnit": "BU1",
    "beyondtrustInstanceId": 1
  }'
```

### Example: Retrieve Users (Customer Scoped)

```bash
curl -X GET "http://localhost:9000/users?publicDisplayNamePatterns=%Acme%" \
  -H "X-Access-Key: your-api-key" \
  -H "X-Tenant-Id: 1"
```

## 📂 Project Structure Overview

```
src/
├── access/              # Access control (API keys, business units)
├── auth/                # Authentication (JWT, local, fallback admin)
├── customer/            # Customer/tenant management
├── user/                # BeyondTrust user management
├── team/                # Team management
├── site/                # Site hierarchies
├── jump-group/          # Jump group management
├── jumpoint/            # Jumpoint management
├── jump-item/           # Jump items (RDP, VNC, SSH, Web, Protocol Tunnel)
├── group-policy/        # Group policy management
├── app-config/          # Configuration service
├── health/              # Health checks
├── monitoring/          # Endpoint tracking
├── log/                 # Exception logging
├── email/               # Email service
├── migration/           # Database migrations
├── shared/              # Shared utilities
└── types/               # TypeScript type extensions
```

## 🛠️ Development Workflow

### 1. Create a New Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Follow the project conventions:

- Use CQRS pattern for all domain operations
- Add guards, interceptors, and pipes for access control
- Create DTOs for all request/response payloads
- Write tests for new features

### 3. Run Tests

```bash
npm run test
npm run test:e2e
```

### 4. Check Linting

```bash
npm run lint
```

### 5. Commit and Push

```bash
git add .
git commit -m "feat: add new feature description"
git push origin feature/your-feature-name
```

### 6. Create Pull Request

Follow project contribution guidelines.

## 🔍 Debugging Tips

### Enable Database Query Logging

In `src/app-config/services/app-config.service.ts`:

```typescript
public get database(): TypeOrmModuleOptions {
    return {
        // ... other config
        logging: true,  // Enable query logging
    };
}
```

### Check Transaction IDs

All requests generate a transaction ID for correlation:

```bash
# Include in request
X-Transaction-Id: your-uuid

# Or let API generate one
# Check logs for: [transaction-id] prefix
```

### View Exception Logs

```bash
# Query exception logs table
SELECT * FROM pra_exception_logs ORDER BY creation_date DESC LIMIT 10;
```

### Monitor Endpoint Access

```bash
# Query monitoring table
SELECT * FROM pra_monitorings ORDER BY creation_date DESC LIMIT 10;
```

## 🆘 Common Issues

### Issue: Database Connection Failed

**Error**: `Unable to connect to the database`

**Solution**:

1. Verify database is running: `docker ps` or `mysql -u root -p`
2. Check `.env` database credentials
3. Ensure database name exists: `CREATE DATABASE pra;`
4. Check connection settings in logs

### Issue: Module Not Found

**Error**: `Cannot find module '@nestjs/...'`

**Solution**:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port Already in Use

**Error**: `Port 9000 is already in use`

**Solution**:

```bash
# Find process using port
lsof -i :9000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=9001
```

### Issue: Migrations Not Running

**Solution**:

- Migrations run automatically on startup
- Check logs for migration errors
- Verify database connection before app starts
- Migration system creates indexes based on TypeORM metadata

### Issue: External API Timeouts

**Error**: `Timeout of 300000ms exceeded`

**Solution**:

1. Check `PRA_SYNC_API_BASE_URL` is accessible
2. Verify external API is running
3. Check network connectivity
4. Review batched processing delays (250ms between calls)

## 🔒 Security Best Practices

### Development Environment

- ✅ Use strong passwords in `.env`
- ✅ Never commit `.env` to git
- ✅ Use separate API keys for dev/staging/prod
- ✅ Keep fallback admin disabled unless needed

### Production Environment

- ✅ Use environment variables (K8s secrets)
- ✅ Enable throttling (`THROTTLE_IS_ENABLED=true`)
- ✅ Use strong JWT secrets (32+ characters)
- ✅ Set `ENV=production` to disable auto-sync
- ✅ Use TLS for database connections
- ✅ Rotate API keys regularly

## 🚢 Deployment

### Docker Build

```bash
npm run docker:build:api
```

### Kubernetes Deployment

See `k8s/deployment.yaml` for reference manifest:

- Health probes configured
- Resource limits set
- Graceful shutdown enabled
- Pod anti-affinity for HA

**Key configurations**:

```yaml
livenessProbe:
    httpGet:
        path: /health/live
        port: 9000
    initialDelaySeconds: 60

readinessProbe:
    httpGet:
        path: /health/ready
        port: 9000
    initialDelaySeconds: 30

resources:
    requests:
        memory: '512Mi'
        cpu: '500m'
    limits:
        memory: '2Gi'
        cpu: '2000m'
```

# PackagePro Constitution

## Core Principles

### I. Type-First & API Clarity
- **All code is written in TypeScript**, with `any` prohibited unless explicitly justified.
- **Public interfaces** (APIs, services, React components) are clearly documented (JSDoc/TSDoc).
- **DTOs are explicitly defined** for each layer: database (Prisma), service logic, and API.

### II. Domain-Driven Modules
- **Each module** is self-contained within `backend/src/modules/` and `frontend/components/`.
- **Modules do not cross responsibilities** (e.g., `orders` module does not directly call `payments` without a clear service boundary).
- **Files follow kebab-case**, functions/variables use camelCase, classes/interfaces use PascalCase.

### III. Conventional Commits (Non-negotiable)
- **Every commit must follow the format** `<type>(<scope>): <subject>`.
- **Allowed types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`.
- **Scope** can be a module name (e.g., `auth`, `orders`) or `frontend`/`backend`.

### IV. Testing Gate
- **Any new feature or bug fix** must be accompanied by tests (unit for services, integration for APIs, e2e for critical flows).
- **Coverage target**: at least 80% for `services/` and `modules/` directories.
- **Tests should ideally be written before implementation** (TDD encouraged but not strictly enforced).

### V. Observability & Error Handling
- **Every service logs structured logs** (using `pino` or `winston`).
- **Expected errors** (e.g., payment failure) must be thrown as `AppError` with `code` and `statusCode`.
- **No internal details** (e.g., stack traces) are leaked to end users.

## Additional Constraints

### Stack & Versioning
- **Backend**: Node.js (LTS) + Fastify + Prisma.
- **Frontend**: Next.js (App Router) + React + Zustand (state management).
- **Database**: PostgreSQL (development: SQLite or PostgreSQL container).
- **Version control**: Git, with `main` as stable branch, and optional `develop` for integration.

### Security Requirements
- **All API endpoints** (except `/health`, `/auth/login`, `/auth/register`) are protected by JWT middleware.
- **Passwords are never stored as plaintext** – only via `bcrypt`.
- **Input validation** is required using `zod` or `joi` (in Fastify `preValidation` hooks).

### Performance Standards
- **API response time** does not exceed 200ms (p95) for reads, and 500ms for writes.
- **First Paint** less than 1.5 seconds on simulated 3G connection.
- **Caching (Redis)** is used when the same request repeats within 10 seconds (e.g., product lists).

## Development Workflow

### Code Review Quality Gates
- **Each PR requires at least one reviewer approval** after:
  - ✅ All automated CI checks pass (`npm test && npm run lint`).
  - ✅ No conflicts with `main`.
  - ✅ Code follows Conventional Commits and defined style.
  - ✅ Test coverage does not decrease.
- **Reviewer checks**:
  - Code readability (naming, comments).
  - No obvious security vulnerabilities (SQL injection, XSS, etc.).
  - Compliance with domain boundaries.

### Local Development Flow
1. **Fork or clone** the repository.
2. **Create a branch** with a meaningful name (`feature/`, `fix/`, `docs/`).
3. **Start development**:
   ```bash
   cd backend && npm run dev   # port 5000
   cd frontend && npm run dev  # port 3000
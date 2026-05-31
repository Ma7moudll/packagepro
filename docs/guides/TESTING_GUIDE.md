# Testing Guide for PackagePro

## Backend Testing

### Setup
```bash
cd backend
npm install -D vitest @vitest/ui supertest @types/supertest
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Open test UI
npx vitest --ui
```

### Test Structure
```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.test.example.ts  ← Create this
│   │   ├── orders/
│   │   │   └── orders.test.example.ts
│   │   └── ...
│   └── services/
│       └── email.test.example.ts
```

### Example Test File

Create `backend/src/modules/auth/auth.test.example.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';

describe('Auth API', () => {
  let server: any;

  beforeAll(async () => {
    server = Fastify();
    // Register routes here
  });

  afterAll(async () => {
    await server.close();
  });

  it('should register a new user', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      },
    });

    expect(response.statusCode).toBe(201);
  });
});
```

## Frontend Testing

### Setup
```bash
cd frontend
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Vitest Config

Create `frontend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### Setup File

Create `frontend/vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

### Example Component Test

Create `frontend/components/ui/button.test.example.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './button';
import { describe, it, expect } from 'vitest';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByText('Click me');
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

## E2E Testing with Playwright

### Setup
```bash
npm install -D @playwright/test
npx playwright install
```

### Example E2E Test

Create `e2e/auth.test.example.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('user can register', async ({ page }) => {
  await page.goto('http://localhost:3001/auth/signup');
  
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.fill('input[name="firstName"]', 'Test');
  await page.fill('input[name="lastName"]', 'User');
  
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL(/\/dashboard/);
});
```

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Critical paths
- **E2E Tests**: User journeys

## Running All Tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test

# E2E
npx playwright test
```

## CI/CD Integration

Tests will run automatically on:
- Pull requests
- Pushes to main/develop branches
- Before deployment

See `.github/workflows/ci.yml` for configuration.

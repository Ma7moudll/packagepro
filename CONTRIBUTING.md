# 🤝 المساهمة في PackagePro - Contributing Guidelines

شكراً لاهتمامك بالمساهمة في PackagePro! هذا الدليل يشرح كيفية المساهمة في المشروع.

---

## 📋 جدول المحتويات

- [Code of Conduct](#code-of-conduct)
- [كيفية المساهمة](#كيفية-المساهمة)
- [معايير الكود](#معايير-الكود)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Development Workflow](#development-workflow)

---

## 📜 Code of Conduct

### قواعدنا

- 🤝 كن محترماً ومهذباً
- 💡 شارك الأفكار البناءة
- 🎯 ركز على الحلول
- 🌍 احترم التنوع
- 📚 ساعد الآخرين على التعلم

---

## 🚀 كيفية المساهمة

### 1. Fork المشروع

```bash
# Fork على GitHub ثم:
git clone https://github.com/your-username/packagepro.git
cd packagepro
git remote add upstream https://github.com/original/packagepro.git
```

### 2. إنشاء Branch جديد

```bash
# استخدم naming convention واضح:
git checkout -b feature/add-new-feature
git checkout -b fix/fix-bug-name
git checkout -b docs/update-readme
git checkout -b refactor/improve-performance
```

### 3. إجراء التغييرات

```bash
# اعمل على التغييرات
# اختبر التغييرات
npm test

# تأكد من Linting
npm run lint

# تأكد من Formatting
npm run format
```

### 4. Commit التغييرات

```bash
git add .
git commit -m "feat: add new feature"
```

### 5. Push و Pull Request

```bash
git push origin feature/add-new-feature
# ثم افتح Pull Request على GitHub
```

---

## 💻 معايير الكود

### TypeScript

```typescript
// ✅ جيد
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

function getUserById(id: string): Promise<User | null> {
  // Implementation
}

// ❌ سيء
function getUser(id: any): any {
  // Implementation
}
```

### Naming Conventions

```typescript
// Variables & Functions: camelCase
const userName = 'John';
function getUserData() {}

// Classes & Interfaces: PascalCase
class UserService {}
interface UserData {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// Files: kebab-case
// user-service.ts
// auth-controller.ts
```

### Code Organization

```typescript
// 1. Imports
import { FastifyInstance } from 'fastify';
import { UserService } from './services/user.service';

// 2. Types & Interfaces
interface CreateUserDto {
  email: string;
  password: string;
}

// 3. Constants
const DEFAULT_PAGE_SIZE = 20;

// 4. Functions
export async function createUser(data: CreateUserDto) {
  // Implementation
}
```

### Comments

```typescript
// ✅ جيد - توضيح للمنطق المعقد
// Calculate price with quantity discount
// Discount tiers: 100-499: 5%, 500-999: 10%, 1000+: 15%
const discount = calculateQuantityDiscount(quantity);

// ❌ سيء - توضيح للواضح
// Set user name
const userName = user.name;
```

---

## 📝 Commit Messages

نستخدم [Conventional Commits](https://www.conventionalcommits.org/)

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: ميزة جديدة
- `fix`: إصلاح bug
- `docs`: تحديث التوثيق
- `style`: تنسيق الكود (لا يؤثر على المنطق)
- `refactor`: إعادة هيكلة الكود
- `perf`: تحسين الأداء
- `test`: إضافة أو تحديث اختبارات
- `chore`: مهام صيانة
- `ci`: تحديثات CI/CD

### Examples

```bash
# Feature
git commit -m "feat(auth): add password reset functionality"

# Bug Fix
git commit -m "fix(orders): resolve duplicate order creation issue"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Refactor
git commit -m "refactor(pricing): improve calculation performance"

# Breaking Change
git commit -m "feat(api)!: change authentication endpoint structure

BREAKING CHANGE: /api/auth/login now requires email instead of username"
```

---

## 🔄 Pull Request Process

### 1. قبل فتح PR

- [ ] تأكد من أن الكود يعمل
- [ ] أضف/حدّث الاختبارات
- [ ] تأكد من نجاح جميع الاختبارات
- [ ] تأكد من Linting
- [ ] حدّث التوثيق إذا لزم الأمر
- [ ] تأكد من عدم وجود conflicts

### 2. PR Template

```markdown
## Description
وصف موجز للتغييرات

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
كيف تم اختبار التغييرات؟

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
- [ ] All tests passing
```

### 3. Review Process

1. **Automated Checks**: يجب أن تنجح جميع CI checks
2. **Code Review**: مراجعة من maintainer واحد على الأقل
3. **Testing**: اختبار التغييرات
4. **Approval**: موافقة من maintainer
5. **Merge**: دمج في main branch

---

## 🛠️ Development Workflow

### Setup

```bash
# 1. Clone & Install
git clone https://github.com/your-username/packagepro.git
cd packagepro
./setup.sh

# 2. Create Branch
git checkout -b feature/my-feature

# 3. Start Development
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Testing

```bash
# Backend Tests
cd backend
npm test
npm run test:coverage

# Frontend Tests
cd frontend
npm test

# E2E Tests
npx playwright test
```

### Linting & Formatting

```bash
# Backend
cd backend
npm run lint
npm run format

# Frontend
cd frontend
npm run lint
```

### Database Changes

```bash
# 1. Update schema.prisma
# 2. Create migration
cd backend
npx prisma migrate dev --name description-of-change

# 3. Test migration
npm run prisma:migrate

# 4. Update seed if needed
# Edit prisma/seed.ts
npm run prisma:seed
```

---

## 🎯 Areas for Contribution

### High Priority 🔴

- [ ] إكمال TODOs في Authentication
- [ ] إضافة Unit Tests
- [ ] إضافة Integration Tests
- [ ] تحسين Error Handling
- [ ] إضافة API Documentation (Swagger)

### Medium Priority 🟡

- [ ] تحسين Performance
- [ ] إضافة Caching
- [ ] تحسين Security
- [ ] إضافة Monitoring
- [ ] تحسين UI/UX

### Low Priority 🟢

- [ ] إضافة ميزات جديدة
- [ ] تحسين Documentation
- [ ] إضافة Examples
- [ ] Refactoring

---

## 📚 Resources

### Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Fastify Documentation](https://www.fastify.io/docs/latest/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

### Tools
- [VS Code](https://code.visualstudio.com/)
- [Postman](https://www.postman.com/)
- [Prisma Studio](https://www.prisma.io/studio)

---

## ❓ Questions?

إذا كان لديك أي أسئلة:

1. تحقق من [README.md](./README.md)
2. راجع [PROJECT_REVIEW.md](./PROJECT_REVIEW.md)
3. راجع [ACTION_PLAN.md](./ACTION_PLAN.md)
4. افتح Issue على GitHub

---

## 🙏 شكراً

شكراً لمساهمتك في PackagePro! كل مساهمة، مهما كانت صغيرة، تساعد في تحسين المشروع.

---

**Happy Coding! 🚀**

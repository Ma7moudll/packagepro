# 🎨 New Frontend Structure

The `frontend` folder was reorganized to improve maintainability and scalability.

## 📁 Overall Structure

```
frontend/
├── app/                        # Next.js App Router Pages
│   ├── (auth)/                 # Auth pages (Login, Signup)
│   ├── (marketing)/            # Marketing pages (About, Contact, etc.)
│   ├── (shop)/                 # Shop pages (Products, Cart, Checkout)
│   ├── (customer)/             # Customer dashboard (Dashboard, Orders)
│   ├── (business)/             # Business pages (B2B, Wholesale)
│   ├── admin/                  # Admin dashboard
│   └── api/                    # API Endpoints (Next.js API Routes)
│
├── components/                 # React Components
│   ├── ui/                     # Base UI components (Buttons, Inputs)
│   ├── layout/                 # Page layout components (Navbar, Footer)
│   ├── features/               # Feature-specific components (LiveChat, Analytics)
│   └── ...                     # Other components
│
├── providers/                  # Context Providers (Auth, Theme, etc.)
│
├── lib/                        # Utilities & Libraries
│   ├── api.ts                  # Unified Axios client
│   └── utils.ts                # General utilities
│
├── store/                      # State Management (Zustand)
│   └── auth-store.ts           # Auth state store
│
├── hooks/                      # Custom React Hooks
└── types/                      # TypeScript Types
```

## 🚀 Key Changes

1. **Route Groups**: Route groups `(group)` were used to organize pages logically without affecting the URL.
   - Example: `frontend/app/(shop)/products` appears in the browser as `/products`.

2. **Components Organization**: Components were moved from `app/components` to the main `components/` folder and split into `layout` and `features`.

3. **Providers**: All providers were grouped into the `providers/` folder.

4. **API & State**:
   - `lib/api.ts` was added for centralized request handling.
   - `store/auth-store.ts` was added to manage authentication state.

## 💡 How to Use

### Adding a New Page
- If the page is public: add it to `(marketing)`.
- If it's store-related: add it to `(shop)`.
- If it's a dashboard: add it to `(customer)`.

### Adding a New Component
- If it's generic (button, input field): `components/ui`.
- If it's part of the layout (sidebar): `components/layout`.
- If it's a standalone feature (chat, map): `components/features`.

### Calling the API
Use `api` from `@/lib/api`:

```typescript
import { api } from '@/lib/api';

const fetchData = async () => {
  const response = await api.get('/endpoint');
  return response.data;
};
```
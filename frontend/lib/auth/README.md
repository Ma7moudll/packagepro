# Authentication System

This directory contains the authentication system for PackagePro using NextAuth.js.

## Features

### ✅ Signup/Login Pages
- **Sign In** (`/auth/signin`): Login page with email/password and OAuth
- **Sign Up** (`/auth/signup`): Registration page with validation
- **Reset Password** (`/auth/reset-password`): Password reset request
- **Reset Password Token** (`/auth/reset-password/[token]`): Password reset confirmation

### ✅ User Profile Management
- **Profile Page** (`/profile`): User profile management
  - Account information (name, email, phone, company, address)
  - Preferences (language, theme, notifications)
  - Password change

### ✅ Session Management
- NextAuth.js session management
- JWT-based sessions
- Session persistence (30 days)
- Auto-refresh on page load

### ✅ OAuth Providers
- Google OAuth
- Facebook OAuth
- Credentials provider (email/password)

### ✅ Email Verification
- Email verification system
- Verification token generation
- Verification page (`/auth/verify-email`)

### ✅ Password Reset
- Password reset request
- Secure token generation
- Password reset confirmation
- Token expiration (1 hour)

## Configuration

### Environment Variables

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-change-in-production

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret

# Email (for verification and password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

## API Routes

### Authentication
- `/api/auth/[...nextauth]`: NextAuth.js handler
- `/api/auth/signup`: User registration
- `/api/auth/reset-password`: Password reset request
- `/api/auth/reset-password/confirm`: Password reset confirmation
- `/api/auth/verify-email`: Email verification

### User Management
- `/api/user/profile`: GET/PUT user profile
- `/api/user/change-password`: Change user password

## Usage

### Sign In

```typescript
import { signIn } from "next-auth/react"

await signIn("credentials", {
  email: "user@example.com",
  password: "password",
  redirect: true,
  callbackUrl: "/",
})
```

### Sign Out

```typescript
import { signOut } from "next-auth/react"

await signOut({ redirect: true, callbackUrl: "/" })
```

### Get Session

```typescript
import { useSession } from "next-auth/react"

const { data: session, status } = useSession()

if (status === "authenticated") {
  console.log(session.user)
}
```

### Server-Side Session

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"

const session = await getServerSession(authOptions)
```

## Pages

- `/auth/signin` - Sign in page
- `/auth/signup` - Sign up page
- `/auth/reset-password` - Request password reset
- `/auth/reset-password/[token]` - Reset password with token
- `/auth/verify-email` - Email verification status
- `/profile` - User profile management

## Security Features

- Password hashing (bcrypt)
- Secure token generation (crypto)
- Token expiration
- CSRF protection (NextAuth.js)
- Session security

## Notes

- Current implementation uses mock database
- In production, replace with Prisma or your database
- Email sending requires SMTP configuration
- OAuth providers require app setup in respective platforms
- All passwords are hashed using bcryptjs


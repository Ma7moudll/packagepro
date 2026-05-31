#!/bin/bash

# Safe replacement for auth routes

# Replace router.push("/auth/login")
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|router.push("/auth/login")|router.push("/login")|g'
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' "s|router.push('/auth/login')|router.push('/login')|g"

# Replace href="/auth/login"
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|href="/auth/login"|href="/login"|g'
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' "s|href='/auth/login'|href='/login'|g"

# Repeat for signup
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|router.push("/auth/signup")|router.push("/signup")|g'
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' "s|router.push('/auth/signup')|router.push('/signup')|g"
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|href="/auth/signup"|href="/signup"|g'
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' "s|href='/auth/signup'|href='/signup'|g"

# Repeat for register -> signup
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|router.push("/auth/register")|router.push("/signup")|g'
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|href="/auth/register"|href="/signup"|g'

# Repeat for signin -> login
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|router.push("/auth/signin")|router.push("/login")|g'
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|href="/auth/signin"|href="/login"|g'

# Redirects in next.config.js could also be useful, but let's fix code first.

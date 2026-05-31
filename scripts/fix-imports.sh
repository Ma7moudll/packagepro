#!/bin/bash

# Fix language-provider imports
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|@/app/components/language-provider|@/providers/language-provider|g'
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|\.\./components/language-provider|@/providers/language-provider|g'
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|\./components/language-provider|@/providers/language-provider|g'
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|@/components/language-provider|@/providers/language-provider|g'

# Fix other providers
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|@/app/components/auth-provider|@/providers/auth-provider|g'
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|@/app/components/cart-provider|@/providers/cart-provider|g'
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|@/app/components/security-provider|@/providers/security-provider|g'

# Fix paths that might look like "../components/X" to "@/providers/X" if inside providers dir
# This is tricky, let's stick to absolute replacements first

# Fix Navbar and Footer
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|@/app/components/navbar|@/components/layout/navbar|g'
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|@/app/components/footer|@/components/layout/footer|g'
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|@/components/navbar|@/components/layout/navbar|g'
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|@/components/footer|@/components/layout/footer|g'

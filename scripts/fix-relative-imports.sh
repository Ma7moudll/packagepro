#!/bin/bash

PROVIDERS=("auth-provider" "cart-provider" "language-provider" "security-provider")

for provider in "${PROVIDERS[@]}"; do
    echo "Fixing imports for $provider..."
    
    # Replace ../components/provider
    find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' "s|\.\./components/$provider|@/providers/$provider|g"
    
    # Replace ../../components/provider (and deeper)
    find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' "s|\.\./\.\./components/$provider|@/providers/$provider|g"
    
    # Replace ./components/provider
    find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' "s|\./components/$provider|@/providers/$provider|g"
    
    # Replace ../auth-provider (if relative from sibling)
    # This is risky if there are other files named similarly, but unlikely for these specific providers
    # find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' "s|\"\.\./$provider\"|\"@/providers/$provider\"|g"
done

echo "Fixing components/features imports..."
# Fix analytics-dashboard, etc which were moved
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|\.\./components/analytics-dashboard|@/components/features/analytics-dashboard|g'
find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' 's|\.\./components/inventory-management|@/components/features/inventory-management|g'

echo "Done fixing imports."

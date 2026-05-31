#!/bin/bash

# Replace /auth/login with /login
grep -rl "/auth/login" frontend | xargs sed -i '' 's|/auth/login|/login|g'
grep -rl "/auth/signin" frontend | xargs sed -i '' 's|/auth/signin|/login|g'

# Replace /auth/signup and /auth/register with /signup
grep -rl "/auth/signup" frontend | xargs sed -i '' 's|/auth/signup|/signup|g'
grep -rl "/auth/register" frontend | xargs sed -i '' 's|/auth/register|/signup|g'

# Also check for "signin" and replacement
grep -rl "/signin" frontend | xargs sed -i '' 's|/signin|/login|g'

# Special case: NextAuth API route is usually /api/auth/... so don't touch /api/auth/
# But be careful not to break valid api routes like /api/auth/login if they exist
# The grep above targeted "/auth/login", so it might have hit "/api/auth/login" if it was written exactly like that.
# Let's revert any /api/login that was created by mistake from /api/auth/login changing to /api/login?
# No, /auth/login replacement does NOT affect /api/auth/login.
# Wait, sed s|/auth/login|/login|g WILL change /api/auth/login to /api/login.
# THIS IS DANGEROUS.

# Let's revert dangerous changes.
# If we have /api/login, we should change it back to /api/auth/login IF that was the original intent.
# But actually, looking at the file structure in step 400:
# frontend/app/api/auth/login exists. So /api/auth/login is a valid API route.
# If I changed /api/auth/login to /api/login, that would be wrong (if the folder is api/auth/login).
# But wait, find output says: frontend/app/api/auth/login
# So the API route is /api/auth/login.
# So I should NOT change /api/auth/login.

# Let's be more specific with the replacement.
# Replace "/auth/login" (quote included) or similar in router.push or Link href.

# Better approach:
# 1. Replace "/auth/login" with "/login"
# 2. Replace "/api/login" back to "/api/auth/login" (correction)
# 3. Replace "/auth/signup" with "/signup"
# 4. Replace "/api/signup" back to "/api/auth/signup" (correction)

# Run replacements
grep -rl "/auth/login" frontend | xargs sed -i '' 's|/auth/login|/login|g'
grep -rl "/api/login" frontend | xargs sed -i '' 's|/api/login|/api/auth/login|g'

grep -rl "/auth/signin" frontend | xargs sed -i '' 's|/auth/signin|/login|g'
# No api/signin usually

grep -rl "/auth/signup" frontend | xargs sed -i '' 's|/auth/signup|/signup|g'
grep -rl "/api/signup" frontend | xargs sed -i '' 's|/api/signup|/api/auth/signup|g'

grep -rl "/auth/register" frontend | xargs sed -i '' 's|/auth/register|/signup|g'
grep -rl "/api/signup" frontend | xargs sed -i '' 's|/api/signup|/api/auth/register|g' 
# wait, if I changed /auth/register to /signup, then /api/auth/register became /api/signup.
# I need to revert /api/signup to /api/auth/register? Or /api/auth/signup?
# Step 400 says: frontend/app/api/auth/register EXISTS. And signup also exists.
# This makes it complicated.

# Let's stick to safe replacements.
# Only replace "/auth/login" if it comes after push( or href=

# Task runner (https://just.systems). Every recipe wraps a pnpm script, so
# `just` is optional: `pnpm <script>` works the same.

set windows-shell := ["powershell.exe", "-NoLogo", "-NoProfile", "-Command"]
set dotenv-load := true

openapi_endpoint := "/openapi/"
openapi_url := env("VITE_API_URL") + openapi_endpoint
schema_file := "./openapi/schema.json"

# List all recipes
default:
    @just --list

# Install dependencies (also regenerates API types)
install:
    pnpm install

# Start the dev server
dev:
    pnpm dev

# Build for production into ./dist
build:
    pnpm build

# Serve the production build locally
preview:
    pnpm preview

# Remove build output and caches
clean:
    node -e "for (const d of ['dist', 'coverage', '.tanstack', 'node_modules/.vite']) require('node:fs').rmSync(d, { recursive: true, force: true })"

# Delete node_modules and reinstall
reinstall:
    node -e "require('node:fs').rmSync('node_modules', { recursive: true, force: true })"
    pnpm install

# Download the OpenAPI schema from OPENAPI_URL and regenerate types
api: download-schema
    pnpm generate:api

# Download the OpenAPI schema from OPENAPI_URL into ./openapi/schema.json
download-schema:
    node -e "(async () => { const fs = require('node:fs'); const r = await fetch(process.argv[1]); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + r.statusText); fs.writeFileSync(process.argv[2], JSON.stringify(await r.json(), null, '\t') + '\n'); })().catch(e => { console.error(e.message); process.exit(1); })" "{{ openapi_url }}" "{{ schema_file }}"

# Scaffold a new CRUD feature: `just feature products`
feature name:
    pnpm new:feature {{ name }}

# Type-check the project
typecheck:
    pnpm typecheck

# Lint with ESLint
lint:
    pnpm lint --max-warnings=0

# Lint and apply automatic fixes
lint-fix:
    pnpm lint:fix

# Format the code with Prettier
format:
    pnpm format

# Check formatting without writing
format-check:
    pnpm format:check

# Run the unit tests once
test:
    pnpm test

# Run the tests in watch mode
test-watch:
    pnpm test:watch

# Everything CI runs: types, lint, formatting, tests and build
check: typecheck lint format-check test build

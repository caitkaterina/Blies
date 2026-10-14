# Supabase adapter: original implementation notes

This document described commit `43fed4f`. For the current end-to-end implementation, use [SUPABASE_SETUP.md](SUPABASE_SETUP.md), [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) and [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md). The frontend now contains real API integration, and customer ownership, shipment history, durable idempotency and email outbox migrations follow the original migration.

The original report remains in Git history. Neither its test results nor newer local tests establish that the user-designated BLIES project has been inspected or configured. No live migration or deployment is implied.

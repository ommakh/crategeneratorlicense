# Secure License Management System

This workspace now includes a production-oriented license management system for a desktop application with:

- Monthly, quarterly, and yearly subscription plans
- Hardware-based device binding using SHA-256
- Ed25519 signing for license integrity
- Encrypted local license storage
- Offline support with server synchronization
- Admin dashboard for generating and managing licenses
- Client SDK for app integration
- PostgreSQL/MySQL-ready schema and API documentation

## Architecture

- Backend API: Express service in `server/index.ts`
- Admin UI: `server/public/admin.html`
- Client SDK: `src/lib/license-sdk.ts`
- Database schema: `docs/database.sql`
- API docs: `docs/api.md`
- Deployment guide: `docs/deployment.md`
- Security guide: `docs/security-best-practices.md`
- Testing guide: `docs/testing.md`

## Quick Start

1. Install dependencies:
   `npm install`
2. Start the license server:
   `npm run license-server`
3. Open the admin dashboard:
   `http://localhost:4000/admin`
4. Start the frontend app if needed:
   `npm run dev`
5. (Optional) Generate a signing key pair:
   `npm run generate-license-keys`

## Deploy the License Generator to Netlify

The included `netlify.toml` builds the frontend and deploys the admin dashboard
at `/admin` plus the license list/generation API. Import this repository into
Netlify after pushing it to GitHub.

Generate a fresh signing key locally before deploying:

```sh
npm run generate-license-keys -- --rotate
```

The previous development key may have been published, so do not reuse it. In
Netlify site environment variables, set `LICENSE_ADMIN_TOKEN` to a long random
secret and `LICENSE_PRIVATE_KEY` to the complete contents of the newly
generated `server/keys/private.pem`. Never commit or share the private key.
Redeploy, visit `/admin`, and enter the admin token. Generated records persist
in Netlify Blobs.

## License Types

- Monthly: 30 days
- Quarterly: 90 days
- Yearly: 365 days

## Local License API Endpoints

- POST `/api/licenses/generate`
- POST `/api/licenses/activate`
- POST `/api/licenses/verify`
- POST `/api/licenses/renew`
- POST `/api/licenses/revoke`
- POST `/api/licenses/deactivate-device`
- GET `/api/licenses/:id`

## Security Model

- Private signing keys exist only on the backend.
- Device IDs are hashed with SHA-256 before storage.
- License payloads are signed with Ed25519.
- Local license files are encrypted before saving.
- Production traffic should use HTTPS only.

## Notes

The Netlify deployment supports admin license listing and generation. The full
Express API endpoints above are for the local server and are not all deployed
as Netlify functions. Netlify Blobs suits the dashboard's low-write workload;
use a transactional database for concurrent writes or relational queries.

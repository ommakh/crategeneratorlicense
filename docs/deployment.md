# Deployment Guide

## Local Development

1. Install dependencies:
   npm install
2. Start the license service:
   npm run license-server
3. Open the admin dashboard:
   http://localhost:4000/admin
4. Keep the main app running separately with:
   npm run dev

## Netlify Deployment

1. Push the repository to GitHub and import it into Netlify. `netlify.toml`
   configures the Vite build, admin page, and license API function routes.
2. Generate a fresh Ed25519 signing key locally:

   ```sh
   npm run generate-license-keys -- --rotate
   ```

   The previous development key may have been published; do not reuse it.
3. Add these site environment variables in Netlify:
   - `LICENSE_ADMIN_TOKEN`: a long, random admin secret.
   - `LICENSE_PRIVATE_KEY`: the complete new `server/keys/private.pem`
     contents. Keep it out of Git.
4. Redeploy, visit `/admin`, and enter the admin token. License records persist
   in Netlify Blobs across deployments.

The Netlify deployment currently provides the admin listing and generation
routes. It does not deploy the remaining Express API routes. Netlify Blobs is
appropriate for a small license dashboard; use a transactional database for
concurrent writes or relational queries.

## Local Development

Run `npm run license-server` and open `http://localhost:4000/admin` for the
full local Express API. The Netlify function routes are used in deployment.

# Crate Generator License Admin

This repository contains a Netlify-hosted admin dashboard for listing and
generating licenses.

## Deploy to Netlify

1. Install dependencies with `npm install`.
2. Generate a fresh Ed25519 key pair with `npm run generate-license-keys`.
   The private key is written to `server/keys/private.pem`; it is ignored by
   Git and must never be committed.
3. In the Netlify site environment variables, set:
   - `LICENSE_ADMIN_TOKEN` to a long, random secret.
   - `LICENSE_PRIVATE_KEY` to the complete contents of `server/keys/private.pem`.
4. Deploy the site and open `/admin`. Enter the admin token to list or generate
   licenses.

The dashboard is served from `server/public/admin.html`. The Netlify function
stores license records in Netlify Blobs and supports listing and generation.

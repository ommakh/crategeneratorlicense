import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

type LicenseType = 'monthly' | 'quarterly' | 'yearly';

type License = {
  id: string;
  customerId: string;
  customerName: string;
  email: string;
  productName: string;
  licenseType: LicenseType;
  status: 'active';
  issuedAt: string;
  activationDate: string;
  expiresAt: string;
  maxActivations: number;
  notes: string;
  activationCount: number;
  licenseKey: string;
  activatedDeviceHash: null;
  signature: string;
  publicKeyId: string;
};

const LICENSE_DAYS: Record<LicenseType, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

// Uses LICENSE_PRIVATE_KEY when configured; otherwise creates an Ed25519 key
// once and keeps it in Netlify Blobs so signing works without manual setup.
const getSigningKey = async () => {
  const value = process.env.LICENSE_PRIVATE_KEY;
  if (value) return crypto.createPrivateKey(value.replace(/\\n/g, '\n'));

  const store = getStore('license-keys');
  let pem = await store.get('private-key');
  if (!pem) {
    const { privateKey } = crypto.generateKeyPairSync('ed25519');
    await store.set('private-key', privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(), { onlyIfNew: true });
    pem = await store.get('private-key');
    if (!pem) throw new Error('Could not store the generated signing key');
  }
  return crypto.createPrivateKey(pem);
};

const signaturePayload = (license: License) => ({
  id: license.id,
  licenseKey: license.licenseKey,
  customerName: license.customerName,
  email: license.email,
  productName: license.productName,
  licenseType: license.licenseType,
  status: license.status,
  issuedAt: license.issuedAt,
  activationDate: license.activationDate,
  expiresAt: license.expiresAt,
  maxActivations: license.maxActivations,
  notes: license.notes,
  activationCount: license.activationCount,
  activatedDeviceHash: license.activatedDeviceHash,
});

const signLicense = async (license: License) => {
  const payload = signaturePayload(license);
  return crypto.sign(
    null,
    Buffer.from(JSON.stringify(payload, Object.keys(payload).sort())),
    await getSigningKey(),
  ).toString('base64');
};

const publicLicense = ({ signature: _signature, ...license }: License) => license;

const validText = (value: unknown, maxLength: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;

const getLicenses = async () => {
  const store = getStore('license-records');
  const { blobs } = await store.list({ prefix: 'license-' });
  const licenses = await Promise.all(
    blobs.map(({ key }) => store.get(key, { type: 'json' }) as Promise<License | null>),
  );
  return licenses
    .filter((license): license is License => license !== null)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
};

export const config = {
  path: ['/api/licenses', '/api/licenses/generate', '/api/public-key'],
};

export default async (request: Request): Promise<Response> => {
  try {
    if (new URL(request.url).pathname === '/api/public-key') {
      const publicKey = crypto.createPublicKey(await getSigningKey()).export({ type: 'spki', format: 'pem' }).toString();
      return new Response(publicKey, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    if (request.method === 'GET') {
      const licenses = await getLicenses();
      return response({ licenses: licenses.map(publicLicense) });
    }

    if (request.method !== 'POST') {
      return response({ error: 'Method not allowed.' }, 405);
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return response({ error: 'Request body must be valid JSON.' }, 400);
    }

    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const productName = typeof body.productName === 'string' ? body.productName.trim() : '';
    const licenseType = body.licenseType;
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const maxActivations = Number(body.maxActivations || 1);

    if (!validText(customerName, 120) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !validText(productName, 120) || typeof licenseType !== 'string' ||
        !Object.hasOwn(LICENSE_DAYS, licenseType) || notes.length > 1000 ||
        !Number.isInteger(maxActivations) || maxActivations < 1 || maxActivations > 1000) {
      return response({ error: 'Enter valid customer, email, product, plan, notes, and activation limit.' }, 400);
    }

    const normalizedType = licenseType as LicenseType;
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + LICENSE_DAYS[normalizedType]);

    const license: License = {
      id: crypto.randomUUID(),
      customerId: crypto.randomUUID(),
      customerName,
      email,
      productName,
      licenseType: normalizedType,
      status: 'active',
      issuedAt: now.toISOString(),
      activationDate: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      maxActivations,
      notes,
      activationCount: 0,
      licenseKey: `LIC-${crypto.randomBytes(6).toString('hex').toUpperCase().match(/.{1,4}/g)?.join('-')}`,
      activatedDeviceHash: null,
      signature: '',
      publicKeyId: 'server-ed25519',
    };

    license.signature = await signLicense(license);
    await getStore('license-records').setJSON(`license-${license.id}`, license, { onlyIfNew: true });

    return response({
      message: 'License generated successfully.',
      license: publicLicense(license),
    }, 201);
  } catch (error) {
    console.error('License API request failed:', error);
    return response({ error: 'License service is not configured or is temporarily unavailable.' }, 500);
  }
};

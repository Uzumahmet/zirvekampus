import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env.local');
const raw = fs.readFileSync(envPath, 'utf8');
const env = {};

for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;

  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;

  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();

  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }

  env[key] = val;
}

const secrets = {
  'supabase-service-role-key': env.SUPABASE_SERVICE_ROLE_KEY,
  'firebase-project-id': env.FIREBASE_PROJECT_ID,
  'firebase-client-email': env.FIREBASE_CLIENT_EMAIL,
  'firebase-private-key': env.FIREBASE_PRIVATE_KEY,
  'gemini-api-key': env.GEMINI_API_KEY,
};

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fb-secrets-'));

try {
  for (const [name, value] of Object.entries(secrets)) {
    if (!value) {
      throw new Error(`Missing secret value for ${name}`);
    }

    const file = path.join(tmpDir, `${name}.txt`);
    fs.writeFileSync(file, value, 'utf8');

    console.log(`Setting secret: ${name}`);
    execSync(
      `firebase apphosting:secrets:set ${name} --data-file ${JSON.stringify(file)} --project globalog2`,
      { stdio: 'inherit' }
    );
  }

  for (const name of Object.keys(secrets)) {
    console.log(`Granting access: ${name}`);
    execSync(
      `firebase apphosting:secrets:grantaccess ${name} --backend erciyes-kampus --project globalog2`,
      { stdio: 'inherit' }
    );
  }
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

console.log('All secrets set.');

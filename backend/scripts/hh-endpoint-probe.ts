/**
 * Probe every candidate-side HH endpoint with the stored token.
 * Usage: npx ts-node scripts/hh-endpoint-probe.ts [candidateId]
 * If candidateId is omitted, uses the first candidate with a token.
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const BASE = 'https://api.hh.ru';
const HOST = 'hh.uz';
const UA = process.env.HH_USER_AGENT ?? 'Crewly/1.0 (contact@crewly.uz)';

async function probe(
  label: string,
  fn: () => Promise<{ status: number; data?: unknown }>,
) {
  try {
    const r = await fn();
    const preview =
      typeof r.data === 'object' && r.data !== null
        ? JSON.stringify(r.data).slice(0, 120)
        : String(r.data ?? '');
    console.log(`  ✅ ${r.status}  ${label}`);
    if (preview) console.log(`       ${preview}`);
  } catch (err: any) {
    const status = err?.response?.status ?? 'ERR';
    const detail = err?.response?.data
      ? JSON.stringify(err.response.data).slice(0, 200)
      : err.message;
    console.log(`  ❌ ${status}  ${label}`);
    if (detail) console.log(`       ${detail}`);
  }
}

async function main() {
  const db = new PrismaClient();
  const candidateId = process.argv[2];

  const candidate = candidateId
    ? await db.candidate.findUnique({
        where: { id: candidateId },
        select: { id: true, hhOauthToken: true, hhRefreshToken: true, hhResumeId: true, hhTokenExpiresAt: true },
      })
    : await db.candidate.findFirst({
        where: { hhOauthToken: { not: null } },
        select: { id: true, hhOauthToken: true, hhRefreshToken: true, hhResumeId: true, hhTokenExpiresAt: true },
      });

  await db.$disconnect();

  if (!candidate?.hhOauthToken) {
    console.error('No candidate with HH token found. Connect HH account first.');
    process.exit(1);
  }

  const token = candidate.hhOauthToken;
  const resumeId = candidate.hhResumeId;
  const expiresAt = candidate.hhTokenExpiresAt;

  console.log('\n=== HH Endpoint Probe ===');
  console.log(`Candidate : ${candidate.id}`);
  console.log(`ResumeId  : ${resumeId ?? '(none)'}`);
  console.log(`Token exp : ${expiresAt?.toISOString() ?? 'unknown'}`);
  console.log(`Expired   : ${expiresAt ? Date.now() >= expiresAt.getTime() : 'unknown'}`);
  console.log('');

  const headers = {
    Authorization: `Bearer ${token}`,
    'User-Agent': UA,
    'HH-User-Agent': UA,
  };
  const params = { host: HOST };

  console.log('--- Identity ---');
  await probe('GET /me', () =>
    axios.get(`${BASE}/me`, { headers, params }).then((r) => ({ status: r.status, data: { auth_type: r.data.auth_type, id: r.data.id, email: r.data.email } })),
  );

  console.log('\n--- Resume list ---');
  await probe('GET /resumes/mine', () =>
    axios.get(`${BASE}/resumes/mine`, { headers, params }).then((r) => ({ status: r.status, data: { count: r.data.items?.length } })),
  );

  if (resumeId) {
    console.log(`\n--- Resume operations (resumeId=${resumeId}) ---`);
    await probe('GET /resumes/{id}', () =>
      axios.get(`${BASE}/resumes/${resumeId}`, { headers, params }).then((r) => ({ status: r.status, data: { title: r.data.title, status: r.data.status?.id } })),
    );
    await probe('GET /resumes/{id}/views', () =>
      axios.get(`${BASE}/resumes/${resumeId}/views`, { headers, params }).then((r) => ({ status: r.status, data: { found: r.data.found } })),
    );
    await probe('GET /resumes/{id}/similar_vacancies', () =>
      axios.get(`${BASE}/resumes/${resumeId}/similar_vacancies`, { headers, params }).then((r) => ({ status: r.status, data: { found: r.data.found } })),
    );
    console.log('  ⏭  PUT /resumes/{id}         — skipped (mutates resume)');
    console.log('  ⏭  POST /resumes/{id}/publish — skipped (mutates resume)');
    console.log('  ⏭  POST /resumes/{id}/hide    — skipped (mutates resume)');
  } else {
    console.log('\n--- Resume operations --- SKIPPED (no resumeId saved)');
  }

  console.log('\n--- Negotiations ---');
  let firstNegotiationId: string | undefined;
  await probe('GET /negotiations', async () => {
    const r = await axios.get(`${BASE}/negotiations`, { headers, params: { ...params, per_page: 5 } });
    firstNegotiationId = r.data.items?.[0]?.id;
    return { status: r.status, data: { count: r.data.items?.length, total: r.data.found } };
  });

  if (firstNegotiationId) {
    await probe(`GET /negotiations/${firstNegotiationId}/messages`, () =>
      axios.get(`${BASE}/negotiations/${firstNegotiationId}/messages`, { headers, params }).then((r) => ({ status: r.status, data: { count: r.data.items?.length } })),
    );
  } else {
    console.log('  ⏭  GET /negotiations/{id}/messages — skipped (no negotiations found)');
  }

  console.log('  ⏭  POST /negotiations              — skipped (would submit real application)');
  console.log('  ⏭  POST /negotiations/{id}/messages — skipped (would send real message)');
  console.log('  ⏭  DELETE /negotiations/{id}        — skipped (would withdraw application)');

  console.log('\n=== Done ===\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

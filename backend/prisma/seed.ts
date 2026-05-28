import { config } from 'dotenv';
config();
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // Candidate sources
  for (const name of ['hh.ru', 'manual', 'telegram_channel']) {
    await prisma.candidateSource.upsert({
      where: { name },
      create: { name, config: name === 'hh.ru' ? { area: '97' } : {} },
      update: {},
    });
  }

  // Feature flags
  for (const name of ['auto_outreach_enabled', 'ai_screening_enabled', 'hh_ingestion_enabled']) {
    await prisma.featureFlag.upsert({
      where: { name },
      create: { name, enabled: false },
      update: {},
    });
  }

  if (process.env.NODE_ENV === 'production') {
    console.log('Seed complete (production — skipping demo data)');
    return;
  }

  // ── Demo company + users ────────────────────────────────────────────────────
  let company = await prisma.company.findFirst({ where: { contactEmail: 'admin@test.local' } });

  if (!company) {
    company = await prisma.company.create({
      data: { name: 'Test IT Company', contactEmail: 'admin@test.local' } as any,
    });
    console.log('Created demo company: Test IT Company');
  }

  let owner = await prisma.user.findFirst({ where: { email: 'admin@test.local' } });
  if (!owner) {
    owner = await prisma.user.create({
      data: {
        companyId: company.id,
        email: 'admin@test.local',
        passwordHash: await argon2.hash('test1234'),
        fullName: 'Test Admin',
        role: 'owner',
        emailVerified: true,
      },
    });
    console.log('Created demo user: admin@test.local / test1234');
  }

  // ── Staff user ──────────────────────────────────────────────────────────────
  const staffExists = await prisma.staff.findUnique({ where: { email: 'staff@agency.local' } });
  if (!staffExists) {
    await prisma.staff.create({
      data: {
        email: 'staff@agency.local',
        passwordHash: await argon2.hash('staff1234'),
        fullName: 'Agency Founder',
        role: 'founder',
      },
    });
    console.log('Created staff user: staff@agency.local / staff1234');
  }

  // ── Demo jobs ───────────────────────────────────────────────────────────────
  const jobDefs = [
    {
      title: 'Senior Backend Engineer (Node.js)',
      description: 'We need an experienced Node.js engineer to lead our API platform. You will design microservices, own performance and reliability, and mentor junior engineers.',
      priority: 'high',
      requiredSkills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis'],
      niceToHaveSkills: ['NestJS', 'Kubernetes', 'GraphQL'],
      minExperienceYears: 3,
      maxExperienceYears: 7,
      salaryMinUzs: BigInt('10000000'),
      salaryMaxUzs: BigInt('18000000'),
      feePercentage: 12,
      feeBasis: 'annual',
      employmentType: 'full-time',
      workMode: 'hybrid',
      status: 'active',
    },
    {
      title: 'React Frontend Developer',
      description: 'Join our product team to build fast, accessible web interfaces. You will work closely with design and backend teams in 2-week sprints.',
      priority: 'normal',
      requiredSkills: ['React', 'TypeScript', 'CSS', 'REST APIs'],
      niceToHaveSkills: ['Next.js', 'Tailwind CSS', 'Figma'],
      minExperienceYears: 2,
      maxExperienceYears: 5,
      salaryMinUzs: BigInt('8000000'),
      salaryMaxUzs: BigInt('14000000'),
      feePercentage: 12,
      feeBasis: 'annual',
      employmentType: 'full-time',
      workMode: 'office',
      status: 'active',
    },
    {
      title: 'DevOps / Platform Engineer',
      description: 'Maintain and evolve our Kubernetes-based infrastructure. Own CI/CD pipelines, observability, and on-call runbooks.',
      priority: 'urgent',
      requiredSkills: ['Kubernetes', 'Docker', 'Terraform', 'Linux'],
      niceToHaveSkills: ['AWS', 'Prometheus', 'Grafana', 'Helm'],
      minExperienceYears: 3,
      maxExperienceYears: 8,
      salaryMinUzs: BigInt('12000000'),
      salaryMaxUzs: BigInt('20000000'),
      feePercentage: 15,
      feeBasis: 'annual',
      employmentType: 'full-time',
      workMode: 'remote',
      status: 'draft',
    },
  ];

  const jobs: any[] = [];
  for (const jd of jobDefs) {
    const existing = await prisma.job.findFirst({
      where: { companyId: company.id, title: jd.title },
    });
    if (!existing) {
      const job = await prisma.job.create({
        data: {
          companyId: company.id,
          createdByUserId: owner.id,
          ...jd,
        } as any,
      });
      jobs.push(job);
      console.log(`Created demo job: ${jd.title}`);
    } else {
      jobs.push(existing);
    }
  }

  // ── Demo candidates ─────────────────────────────────────────────────────────
  const manualSource = await prisma.candidateSource.findUnique({ where: { name: 'manual' } });

  const candidateDefs = [
    {
      fullName: 'Azizbek Toshmatov',
      email: 'azizbek@example.com',
      city: 'Tashkent',
      currentPosition: 'Backend Developer',
      currentCompany: 'Uzum Market',
      yearsExperience: 4,
      skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
      expectedSalaryUzs: BigInt('14000000'),
      consentStatus: 'explicit',
    },
    {
      fullName: 'Dilnoza Yusupova',
      email: 'dilnoza@example.com',
      city: 'Tashkent',
      currentPosition: 'React Developer',
      currentCompany: 'Payme',
      yearsExperience: 3,
      skills: ['React', 'TypeScript', 'Redux', 'CSS'],
      expectedSalaryUzs: BigInt('11000000'),
      consentStatus: 'explicit',
    },
    {
      fullName: 'Jasur Mirzayev',
      email: 'jasur@example.com',
      city: 'Samarkand',
      currentPosition: 'DevOps Engineer',
      currentCompany: 'Click',
      yearsExperience: 5,
      skills: ['Kubernetes', 'Docker', 'AWS', 'Terraform'],
      expectedSalaryUzs: BigInt('17000000'),
      consentStatus: 'implicit',
    },
    {
      fullName: 'Nodira Karimova',
      email: 'nodira@example.com',
      city: 'Tashkent',
      currentPosition: 'Junior Frontend Developer',
      currentCompany: 'Freelance',
      yearsExperience: 1,
      skills: ['React', 'JavaScript', 'HTML', 'CSS'],
      expectedSalaryUzs: BigInt('6000000'),
      consentStatus: 'explicit',
    },
  ];

  const candidates: any[] = [];
  for (const cd of candidateDefs) {
    const existing = await prisma.candidate.findFirst({
      where: { email: cd.email },
    });
    if (!existing) {
      const candidate = await prisma.candidate.create({
        data: {
          sourceId: manualSource?.id,
          fullName: cd.fullName,
          fullNameNormalized: cd.fullName.toLowerCase(),
          email: cd.email,
          city: cd.city,
          currentPosition: cd.currentPosition,
          currentCompany: cd.currentCompany,
          yearsExperience: cd.yearsExperience,
          skills: cd.skills,
          expectedSalaryUzs: cd.expectedSalaryUzs,
          consentStatus: cd.consentStatus,
          consentGivenAt: new Date(),
        } as any,
      });
      candidates.push(candidate);
      console.log(`Created demo candidate: ${cd.fullName}`);
    } else {
      candidates.push(existing);
    }
  }

  // ── Demo applications ───────────────────────────────────────────────────────
  const appDefs = [
    { candidateIdx: 0, jobIdx: 0, status: 'delivered', matchScore: 87 },
    { candidateIdx: 1, jobIdx: 1, status: 'screening', matchScore: 74 },
    { candidateIdx: 2, jobIdx: 2, status: 'matched', matchScore: 91 },
    { candidateIdx: 3, jobIdx: 1, status: 'rejected_by_client', matchScore: 42 },
  ];

  for (const ad of appDefs) {
    const candidate = candidates[ad.candidateIdx];
    const job = jobs[ad.jobIdx];
    if (!candidate || !job) continue;

    const existing = await prisma.application.findFirst({
      where: { candidateId: candidate.id, jobId: job.id },
    });
    if (!existing) {
      await prisma.application.create({
        data: {
          companyId: company.id,
          candidateId: candidate.id,
          jobId: job.id,
          status: ad.status,
          matchScore: ad.matchScore,
        } as any,
      });
      console.log(`Created application: ${candidate.fullName} → ${job.title} (${ad.status})`);
    }
  }

  console.log('\nSeed complete. Login credentials:');
  console.log('  Client:  admin@test.local  /  test1234');
  console.log('  Staff:   staff@agency.local / staff1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

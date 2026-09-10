import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { dataSourceOptions } from '../../data-source';
import { User } from '../../modules/users/entities/user.entity';
import { Role } from '../../common/guards/roles.enum';
import { Service } from '../../modules/services/entities/service.entity';

config({ path: resolve(process.cwd(), '.env') });

const DEFAULT_SERVICES = [
  {
    slug: 'software-product-development',
    title: 'Software & Digital Product Development',
    summary:
      'Robust, scalable software and digital products tailored to your business needs — from concept to deployment.',
    description:
      'Our agile teams deliver web, mobile, and cloud solutions that drive growth and innovation across the full product lifecycle.',
    features: ['Web applications', 'Mobile apps', 'Cloud solutions', 'API development'],
    isPublished: true,
    displayOrder: 1,
  },
  {
    slug: 'ai-automation',
    title: 'AI & Automation',
    summary: 'Intelligent systems that automate workflows and unlock insight from your data.',
    description: 'From chat assistants to full pipeline automation — practical AI that ships value.',
    features: ['Conversational AI', 'Workflow automation', 'Data pipelines'],
    isPublished: true,
    displayOrder: 2,
  },
  {
    slug: 'edtech',
    title: 'EdTech',
    summary: 'Learning platforms engineered for engagement and measurable outcomes.',
    description: 'LMS builds, interactive content tooling, and assessment platforms for institutions and startups.',
    features: ['Learning platforms', 'Content tooling', 'Assessments'],
    isPublished: true,
    displayOrder: 3,
  },
  {
    slug: 'healthtech',
    title: 'HealthTech',
    summary: 'Human-centered health technology with security and compliance at the core.',
    description: 'Patient engagement tools, telehealth platforms, and clinical data integrations.',
    features: ['Telehealth', 'Patient engagement', 'Clinical integrations'],
    isPublished: true,
    displayOrder: 4,
  },
];

async function seed(): Promise<void> {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@synapgrid.net').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123!';

  const usersRepo = dataSource.getRepository(User);
  const existingAdmin = await usersRepo.findOne({ where: { email } });
  if (!existingAdmin) {
    await usersRepo.save(
      usersRepo.create({
        email,
        passwordHash: await argon2.hash(password),
        name: 'SynapGrid Admin',
        role: Role.ADMIN,
      }),
    );
    console.log(`✔ Seeded admin user ${email}`);
  } else {
    console.log(`• Admin user ${email} already exists — skipping`);
  }

  const servicesRepo = dataSource.getRepository(Service);
  for (const svc of DEFAULT_SERVICES) {
    const existing = await servicesRepo.findOne({ where: { slug: svc.slug } });
    if (!existing) {
      await servicesRepo.save(servicesRepo.create(svc));
      console.log(`✔ Seeded service "${svc.title}"`);
    }
  }

  await dataSource.destroy();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

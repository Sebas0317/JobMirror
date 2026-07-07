import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const prisma = new PrismaClient();
  const filePath = path.resolve(process.cwd(), 'profile.json');
  if (!fs.existsSync(filePath)) {
    console.error('profile.json not found in project root.');
    process.exit(1);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  await prisma.profile.deleteMany();
  await prisma.profile.create({
    data: {
      name: data.name,
      seniority: data.seniority,
      skills: JSON.stringify(data.skills),
      experience: data.experience,
      targetRoles: JSON.stringify(data.targetRoles || []),
      preferredLocations: JSON.stringify(data.preferredLocations || []),
      avoidKeywords: JSON.stringify(data.avoidKeywords || []),
      education: data.education || null,
    },
  });
  console.log('Profile saved.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

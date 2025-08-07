import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: 'ADMIN',
    },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10); // Passwort hashen
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin',
        last_name: 'Istrator',
        role: 'ADMIN',
      },
    });
    console.log('Admin user created:', adminUser);
  } else {
    console.log('Admin user already exists.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
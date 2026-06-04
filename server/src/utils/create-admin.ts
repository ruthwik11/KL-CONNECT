import prisma from "../config/db";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

const ADMINS_TO_PROVISION = [
  {
    username: "Joe Goldberg",
    email: "joegoldberg@gmail.com",
    password: "Nene1stadmin",
  },
  {
    username: "Jonathan Moore",
    email: "jonathanmoore@gmail.com",
    password: "Decoyadmin@768",
  },
  {
    username: "Will Bettelheim",
    email: "willbettelheim@gmail.com",
    password: "Decoyadmin@2143",
  },
];

async function createAdmin() {
  console.log("🛠️  Initializing Admin Account Provisioning...");
  try {
    // 1. Clear any existing admin accounts to avoid duplicates or leftovers
    console.log("🗑️  Purging existing administrative accounts...");
    await prisma.user.deleteMany({
      where: {
        role: "ADMIN",
      },
    });
    console.log("✓ Old admin accounts cleared.");

    // 2. Loop and provision each admin account
    for (const data of ADMINS_TO_PROVISION) {
      const password_hash = await bcrypt.hash(data.password, SALT_ROUNDS);

      const adminUser = await prisma.user.create({
        data: {
          username: data.username,
          email: data.email,
          password_hash,
          role: "ADMIN",
          is_verified: true,
          is_suspended: false,
        },
      });

      console.log(`✨ Admin provisioned: "${adminUser.username}" | 📧 ${adminUser.email} | 🔑 ${data.password}`);
    }

    console.log("🟢 All administrative credentials successfully loaded.");
  } catch (error: any) {
    console.error("❌ Failed to provision admin accounts:", error.message || error);
    console.log("\n💡 Make sure your PostgreSQL & Redis Docker containers are running: docker compose up -d");
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

import prisma from "../config/db";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const SALT_ROUNDS = 12;

const ADMINS_TO_PROVISION: { username: string; email: string; password: string }[] = [];

if (process.env.ADMIN_1_USERNAME && process.env.ADMIN_1_EMAIL && process.env.ADMIN_1_PASSWORD) {
  ADMINS_TO_PROVISION.push({
    username: process.env.ADMIN_1_USERNAME,
    email: process.env.ADMIN_1_EMAIL,
    password: process.env.ADMIN_1_PASSWORD,
  });
}

if (process.env.ADMIN_2_USERNAME && process.env.ADMIN_2_EMAIL && process.env.ADMIN_2_PASSWORD) {
  ADMINS_TO_PROVISION.push({
    username: process.env.ADMIN_2_USERNAME,
    email: process.env.ADMIN_2_EMAIL,
    password: process.env.ADMIN_2_PASSWORD,
  });
}

if (process.env.ADMIN_3_USERNAME && process.env.ADMIN_3_EMAIL && process.env.ADMIN_3_PASSWORD) {
  ADMINS_TO_PROVISION.push({
    username: process.env.ADMIN_3_USERNAME,
    email: process.env.ADMIN_3_EMAIL,
    password: process.env.ADMIN_3_PASSWORD,
  });
}

async function createAdmin() {
  console.log("🛠️  Initializing Admin Account Provisioning...");
  try {
    if (ADMINS_TO_PROVISION.length === 0) {
      console.warn("⚠️ No admin accounts configured in environment variables. Skipping provisioning.");
      return;
    }

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

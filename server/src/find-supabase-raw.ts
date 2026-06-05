import { execSync } from "child_process";

const regions = [
  "us-east-1",      // N. Virginia
  "ap-south-1",      // Mumbai
  "ap-southeast-1", // Singapore
  "eu-central-1",   // Frankfurt
];

async function findRegion() {
  const projectId = "diitindbdjbxectrzanj";
  const password = encodeURIComponent("Sireesha@303");

  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const dbUrl = `postgresql://postgres.${projectId}:${password}@${host}:6543/postgres?pgbouncer=true`;
    
    console.log(`\n--- Checking ${region} (${host}) ---`);
    try {
      execSync("npx prisma db pull", {
        env: { ...process.env, DATABASE_URL: dbUrl },
        stdio: "pipe",
        timeout: 10000
      });
      console.log("🟢 SUCCESS!");
    } catch (err: any) {
      const output = err.stderr?.toString() || err.stdout?.toString() || err.message || "";
      console.log(output.trim());
    }
  }
}

findRegion();

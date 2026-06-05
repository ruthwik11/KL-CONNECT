import { execSync } from "child_process";

const regions = [
  "us-east-1",      // N. Virginia
  "us-east-2",      // Ohio
  "us-west-1",      // N. California
  "us-west-2",      // Oregon
  "ap-south-1",      // Mumbai
  "ap-southeast-1", // Singapore
  "ap-southeast-2", // Sydney
  "ap-northeast-1", // Tokyo
  "ap-northeast-2", // Seoul
  "eu-west-1",      // Ireland
  "eu-west-2",      // London
  "eu-west-3",      // Paris
  "eu-central-1",   // Frankfurt
  "sa-east-1",      // Sao Paulo
  "ca-central-1"    // Canada
];

async function findRegion() {
  const projectId = "diitindbdjbxectrzanj";
  const password = encodeURIComponent("Sireesha@303");
  console.log(`Locating the exact Supabase host region for project "${projectId}"...`);

  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const dbUrl = `postgresql://postgres.${projectId}:${password}@${host}:6543/postgres?pgbouncer=true&connection_limit=1`;
    
    console.log(`Checking region: ${region} (${host})...`);
    
    try {
      // Execute prisma db push/pull with a short timeout
      execSync("npx prisma db pull", {
        env: { ...process.env, DATABASE_URL: dbUrl },
        stdio: "pipe",
        timeout: 8000
      });
      
      console.log(`\n🟢 SUCCESS! Region is ${region}. Connects and pulls successfully.`);
      console.log(`Cloud DATABASE_URL for Prisma:\n${dbUrl}`);
      return;
    } catch (err: any) {
      const output = err.stderr?.toString() || err.stdout?.toString() || err.message || "";
      
      if (output.includes("tenant/user") && output.includes("not found")) {
        // Tenant not found in this region, move to next
        continue;
      }
      
      if (output.includes("password authentication failed") || output.includes("Authentication failed")) {
        console.log(`\n🟡 Region is ${region}, but password authentication failed. Please double-check your database password!`);
        console.log(`Cloud DATABASE_URL for Prisma:\n${dbUrl}`);
        return;
      }
      
      // If it connected but failed because of empty schema or similar (Prisma db pull on empty db fails with empty schema error, which is NORMAL)
      if (output.includes("does not contain any tables") || output.includes("No tables found")) {
        console.log(`\n🟢 SUCCESS! Region is ${region}. (Empty database structure is ready for push).`);
        console.log(`Cloud DATABASE_URL for Prisma:\n${dbUrl}`);
        return;
      }

      console.log(`   (Failed with: ${output.trim().slice(0, 100)})`);
    }
  }
  
  console.log("\n❌ Could not locate the correct region. Verify your password or project ID.");
}

findRegion();

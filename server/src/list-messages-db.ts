import prisma from "./config/db";

async function main() {
  try {
    const messageCount = await prisma.message.count();
    console.log("Total messages in DB:", messageCount);

    const messages = await prisma.message.findMany({
      take: 10,
      orderBy: { timestamp: "desc" },
      include: {
        sender: {
          select: { username: true }
        }
      }
    });

    console.log("Latest 10 messages:");
    for (const msg of messages) {
      console.log(`[${msg.timestamp.toISOString()}] ${msg.sender.username} to ${msg.target_id} (${msg.target_type}): ${msg.content}`);
    }
  } catch (err: any) {
    console.error("Error connecting or querying:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

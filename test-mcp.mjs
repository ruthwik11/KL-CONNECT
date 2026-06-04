import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  const serverUrl = "https://mcp.typeui.sh/mcp";
  console.log(`Connecting to Streamable HTTP transport at ${serverUrl}...`);
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));

  try {
    await client.connect(transport);
    console.log("Connected! Listing tools...");
    const response = await client.listTools();
    console.log("Tools response:", JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("Connection failed:", error);
  } finally {
    process.exit(0);
  }
}

main();

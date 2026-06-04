import fs from "fs";
import readline from "readline";

async function listPageWrites() {
  const filePath = "C:/Users/sairu/.gemini/antigravity/brain/ccaa66f4-a2c8-48e8-9b2f-b4dffcc786e4/.system_generated/logs/transcript.jsonl";
  const fileStream = fs.createReadStream(filePath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log("Listing all tool calls that wrote to page.tsx:");
  for await (const line of rl) {
    const step = JSON.parse(line);
    if (step.tool_calls) {
      for (const call of step.tool_calls) {
        if (
          (call.name === "write_to_file" || call.name === "replace_file_content") &&
          (call.args.TargetFile && call.args.TargetFile.includes("page.tsx"))
        ) {
          console.log(`Step ${step.step_index}: ${call.name} -> TargetFile: ${call.args.TargetFile}`);
          const content = call.args.CodeContent || call.args.ReplacementContent || "";
          console.log(`  Content preview: ${content.substring(0, 150)}...`);
        }
      }
    }
  }
}

listPageWrites();

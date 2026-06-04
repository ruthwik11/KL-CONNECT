import fs from "fs";
import readline from "readline";

async function recover() {
  const filePath = "C:/Users/sairu/.gemini/antigravity/brain/ccaa66f4-a2c8-48e8-9b2f-b4dffcc786e4/.system_generated/logs/transcript.jsonl";
  const fileStream = fs.createReadStream(filePath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log("Searching transcript logs for writes targeting page.tsx...");
  let matchContent: string | null = null;
  let matchIndex = -1;

  for await (const line of rl) {
    const step = JSON.parse(line);
    if (step.tool_calls) {
      for (const call of step.tool_calls) {
        if (
          (call.name === "write_to_file" || call.name === "replace_file_content") &&
          call.args.TargetFile
        ) {
          const normalizedPath = call.args.TargetFile.replace(/\\/g, "/");
          if (normalizedPath.endsWith("src/app/page.tsx")) {
            const content = call.args.CodeContent || call.args.ReplacementContent || "";
            if (content.includes("motion") && content.includes("START GAME")) {
              matchContent = content;
              matchIndex = step.step_index;
            }
          }
        }
      }
    }
  }

  if (matchContent) {
    console.log(`FOUND original Framer Motion page.tsx in step ${matchIndex}`);
    fs.writeFileSync("../src/app/page.tsx", matchContent, "utf8");
    console.log("Successfully restored original page.tsx!");
  } else {
    console.log("Could not find the original page.tsx content.");
  }
}

recover();

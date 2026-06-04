import fs from "fs";
import path from "path";

function listDirRecursive(dir: string, depth = 0) {
  if (depth > 3) return;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      const indent = "  ".repeat(depth);
      if (stat.isDirectory()) {
        console.log(`${indent}[DIR] ${file}`);
        listDirRecursive(fullPath, depth + 1);
      } else {
        console.log(`${indent}[FILE] ${file} (${stat.size} bytes)`);
      }
    }
  } catch (err: any) {
    console.error(`Error reading ${dir}:`, err.message);
  }
}

const targetDir = "C:/Users/sairu/.gemini/antigravity/brain/ccaa66f4-a2c8-48e8-9b2f-b4dffcc786e4";
console.log(`Listing files in ${targetDir}:`);
listDirRecursive(targetDir);

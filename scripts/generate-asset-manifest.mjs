import { readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(process.cwd(), "public/assets/generated-4k");
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
      files.push(relative(root, absolute).replaceAll("\\", "/"));
    }
  }
}

await walk(root);
files.sort();
await writeFile(join(root, "manifest.json"), `${JSON.stringify({ version: 1, files }, null, 2)}\n`, "utf8");
console.log(`Generated ${files.length} generated-4k asset entries.`);

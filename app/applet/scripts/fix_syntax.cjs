const fs = require("fs");
const path = require("path");

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, fileList);
    } else if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const modulesDir = path.resolve("apps/local-web/src/modules");
const files = walk(modulesDir);

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  let updated = content;

  // Fix export { ... } "@/..." -> export { ... } from "@/..."
  updated = updated.replace(/(export\s+\{[^}]+\})\s+(["']@\/[^"']+["'])/g, '$1 from $2');

  // Fix import { ... } "@/..." -> import { ... } from "@/..."
  updated = updated.replace(/(import\s+(?:type\s+)?\{[^}]+\})\s+(["']@\/[^"']+["'])/g, '$1 from $2');

  if (updated !== content) {
    fs.writeFileSync(file, updated, "utf8");
    console.log("Fixed exports/imports in:", path.relative(modulesDir, file));
  }
}
console.log("Done fixing export/import syntax.");

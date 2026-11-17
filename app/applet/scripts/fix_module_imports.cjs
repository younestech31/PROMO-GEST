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
const topLevelDirs = ["core", "shared", "types", "localization", "services", "components", "layouts", "hooks", "utils", "features", "modules", "app"];

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  let updated = content;
  
  for (const dir of topLevelDirs) {
    const regex = new RegExp(`(['"])((?:\\.\\./)+)` + dir + `(/[^'"]*)\\1`, "g");
    updated = updated.replace(regex, (match, quote, p1, p2) => {
      return `"@/${dir}${p2}"`;
    });
  }

  if (updated !== content) {
    fs.writeFileSync(file, updated, "utf8");
    console.log("Updated:", path.relative(modulesDir, file));
  }
}
console.log("Done fixing module imports cleanly.");

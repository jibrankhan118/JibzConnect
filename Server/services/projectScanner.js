const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PROJECT_ROOT = path.join(__dirname, "../..");

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".json",
]);

function shouldIgnore(filePath) {
  const parts = filePath.split(path.sep);

  return parts.some((part) => IGNORE_DIRS.has(part));
}

function getFileHash(content) {
  return crypto
    .createHash("sha256")
    .update(content)
    .digest("hex");
}

function scanDirectory(directory) {
  const files = [];

  if (!fs.existsSync(directory)) {
    return files;
  }

  const entries = fs.readdirSync(directory, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (shouldIgnore(fullPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...scanDirectory(fullPath));
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      continue;
    }

    if (entry.name === ".env") {
      continue;
    }

    try {
      const content = fs.readFileSync(fullPath, "utf8");

      const relativePath = path.relative(
        PROJECT_ROOT,
        fullPath
      );

      files.push({
        sourcePath: relativePath,
        content,
        fileHash: getFileHash(content),
      });
    } catch (error) {
      console.error(
        `Could not read file: ${fullPath}`,
        error.message
      );
    }
  }

  return files;
}

function scanProject() {
  const foldersToScan = [
    path.join(PROJECT_ROOT, "Server"),
    path.join(PROJECT_ROOT, "Client", "src"),
  ];

  let files = [];

  for (const folder of foldersToScan) {
    files.push(...scanDirectory(folder));
  }

  return files;
}

module.exports = {
  scanProject,
};
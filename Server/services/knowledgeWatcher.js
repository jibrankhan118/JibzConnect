const chokidar = require("chokidar");
const { syncProjectKnowledge } = require("./knowledgeSync");

let syncRunning = false;

function startKnowledgeWatcher() {
  const projectPath = process.cwd();

  const watcher = chokidar.watch(projectPath, {
    ignored: [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/.vite/**",
    ],
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on("change", async (filePath) => {
    console.log(`Knowledge change detected: ${filePath}`);

    if (syncRunning) {
      console.log("Knowledge sync already running. Skipping this change.");
      return;
    }

    try {
      syncRunning = true;

      console.log("Starting knowledge synchronization...");

      const result = await syncProjectKnowledge();

      console.log("Knowledge synchronization completed:", result);
    } catch (error) {
      console.error("Knowledge synchronization failed:", error.message);
    } finally {
      syncRunning = false;
    }
  });

  watcher.on("add", async (filePath) => {
    console.log(`New knowledge file detected: ${filePath}`);
  });

  watcher.on("unlink", async (filePath) => {
    console.log(`Knowledge file removed: ${filePath}`);
  });

  console.log("Knowledge watcher started.");
}

module.exports = {
  startKnowledgeWatcher,
};
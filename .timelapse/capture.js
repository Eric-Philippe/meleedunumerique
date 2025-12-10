#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const config = require("../.timelapse.json");

// Import Playwright
const { chromium } = require("playwright");

async function captureSnapshots() {
  if (!config.enabled) {
    console.log("Timelapse is disabled");
    process.exit(0);
  }

  const snapshotDir = path.join(process.cwd(), config.snapshotFolder);
  const indexFile = path.join(process.cwd(), ".timelapse", "index.json");

  // Ensure snapshot directory exists
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  // Get the latest commit for target folder
  const commitLine = execSync(
    `git log -1 --oneline -- ${config.targetFolder}`,
    { encoding: "utf-8" }
  ).trim();

  const [hash, ...messageParts] = commitLine.split(" ");
  const commits = [
    {
      hash: hash.trim(),
      message: messageParts.join(" ").trim(),
    },
  ];

  console.log(
    `Capturing latest commit for ${config.targetFolder}: ${commits[0].hash}`
  );

  const snapshots = [];
  const browser = await chromium.launch();

  for (const commit of commits) {
    console.log(`Processing commit: ${commit.hash} - ${commit.message}`);

    try {
      // Checkout commit
      execSync(`git checkout ${commit.hash} -- ${config.targetFolder}`, {
        stdio: "inherit",
      });

      const snapshotPath = path.join(snapshotDir, commit.hash);

      // Create snapshot directory
      if (!fs.existsSync(snapshotPath)) {
        fs.mkdirSync(snapshotPath, { recursive: true });
      }

      // Copy target folder contents to snapshot/target
      const sourceDir = path.join(process.cwd(), config.targetFolder);
      const targetDir = path.join(snapshotPath, "target");

      // Create target directory and copy contents
      fs.mkdirSync(targetDir, { recursive: true });
      execSync(`cp -r ${sourceDir}/* ${targetDir}/`);

      // Get commit metadata
      const author = execSync(`git show -s --format='%an' ${commit.hash}`, {
        encoding: "utf-8",
      }).trim();
      const date = execSync(`git show -s --format='%aI' ${commit.hash}`, {
        encoding: "utf-8",
      }).trim();

      // Try to capture screenshot if index.html exists
      let screenshotPath = null;
      const indexPath = path.join(sourceDir, "index.html");

      if (fs.existsSync(indexPath)) {
        try {
          const fileUrl = `file://${path.resolve(indexPath)}`;
          const page = await browser.newPage();
          await page.goto(fileUrl, { waitUntil: "networkidle" });
          screenshotPath = path.join(snapshotPath, "screenshot.png");
          await page.screenshot({ path: screenshotPath, fullPage: true });
          await page.close();
          console.log(`  ✓ Screenshot captured`);
        } catch (err) {
          console.log(`  ⚠ Could not capture screenshot: ${err.message}`);
        }
      }

      snapshots.push({
        hash: commit.hash,
        message: commit.message,
        author: author,
        date: date,
        folder: config.targetFolder,
        hasScreenshot: screenshotPath !== null,
      });

      console.log(`  ✓ Snapshot saved`);
    } catch (error) {
      console.error(`  ✗ Error processing commit: ${error.message}`);
    }
  }

  await browser.close();

  // Reset to current branch
  try {
    execSync(`git checkout ${config.branch}`);
  } catch {
    console.warn("Could not checkout branch");
  }

  // Save index
  fs.writeFileSync(indexFile, JSON.stringify(snapshots.reverse(), null, 2));
  console.log(
    `\n✓ Timelapse capture complete! ${snapshots.length} snapshots saved`
  );
}

captureSnapshots().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

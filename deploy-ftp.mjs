/**
 * FTP Deploy Script for Masterok Web
 * Uploads contents of ./out/ to Timeweb hosting via FTP
 */
import { Client } from "basic-ftp";
import { readdir, stat } from "fs/promises";
import { join, posix } from "path";

// FTP credentials — set via environment variables
const CONFIG = {
  host: process.env.FTP_HOST || "vh456.timeweb.ru",
  user: process.env.FTP_USER || "cm441996",
  password: process.env.FTP_PASSWORD,
  secure: false,
  port: 21,
};

if (!CONFIG.password) {
  console.error("Error: FTP_PASSWORD environment variable is required.");
  console.error("Usage: FTP_PASSWORD=your_password node deploy-ftp.mjs");
  process.exit(1);
}

const LOCAL_DIR = "./out";
const REMOTE_DIR = "/Masterok/public_html";

let uploadedCount = 0;
let failedCount = 0;

/**
 * Recursively collect all files from local directory.
 */
async function collectFiles(localDir, remoteDir) {
  const files = [];
  const entries = await readdir(localDir, { withFileTypes: true });

  for (const entry of entries) {
    const localPath = join(localDir, entry.name);
    const remotePath = posix.join(remoteDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectFiles(localPath, remotePath));
    } else {
      files.push({ localPath, remotePath });
    }
  }

  return files;
}

/**
 * Collect all unique directories from the file list.
 */
function collectDirs(files) {
  const dirs = new Set();
  for (const { remotePath } of files) {
    let dir = posix.dirname(remotePath);
    while (dir && dir !== "/" && dir !== ".") {
      dirs.add(dir);
      dir = posix.dirname(dir);
    }
  }
  // Sort by depth (shortest first) to create parent dirs before children
  return [...dirs].sort((a, b) => a.split("/").length - b.split("/").length);
}

async function main() {
  const client = new Client();
  client.ftp.verbose = false;

  try {
    console.log(`Connecting to ${CONFIG.host}...`);
    await client.access(CONFIG);
    console.log("Connected!\n");

    const pwd = await client.pwd();
    console.log(`FTP root: ${pwd}`);

    // Clear remote directory
    console.log(`Clearing ${REMOTE_DIR}...`);
    try {
      await client.cd(REMOTE_DIR);
      await client.clearWorkingDir();
      await client.cd("/");
      console.log("Cleared.\n");
    } catch (err) {
      console.log(`Clear failed (${err.message}), will create dir.\n`);
      await client.cd("/");
    }

    // Collect all files
    console.log(`Scanning ${LOCAL_DIR}...`);
    const files = await collectFiles(LOCAL_DIR, REMOTE_DIR);
    console.log(`Found ${files.length} files to upload.\n`);

    // Create all directories first using ensureDir
    const dirs = collectDirs(files);
    console.log(`Creating ${dirs.length} directories...`);
    for (const dir of dirs) {
      try {
        // ensureDir creates full path and cd's into it
        await client.ensureDir(dir);
        await client.cd("/"); // reset after ensureDir
      } catch (err) {
        console.log(`  Warning: could not create ${dir}: ${err.message}`);
      }
    }
    console.log("Directories created.\n");

    // Upload all files using absolute paths
    console.log("Uploading files...\n");
    for (const { localPath, remotePath } of files) {
      const stats = await stat(localPath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      process.stdout.write(`  ${remotePath} (${sizeKB} KB)...`);

      try {
        await client.uploadFrom(localPath, remotePath);
        uploadedCount++;
        console.log(" ✓");
      } catch (err) {
        failedCount++;
        console.log(` ✗ ${err.message}`);
      }
    }

    // Verify
    await client.cd(REMOTE_DIR);
    const remoteItems = await client.list();

    console.log(`\n--- Deploy Summary ---`);
    console.log(`Uploaded: ${uploadedCount} files`);
    console.log(`Failed:   ${failedCount} files`);
    console.log(`Remote ${REMOTE_DIR}/ contains: ${remoteItems.length} top-level items`);

    if (failedCount > 0) {
      console.error(`\n⚠️  ${failedCount} files failed to upload!`);
      process.exit(1);
    }

    if (remoteItems.length === 0) {
      console.error(`\n⚠️  Remote directory is empty after upload!`);
      process.exit(1);
    }

    console.log("\n✅ Deploy complete!");
  } catch (err) {
    console.error("Deploy failed:", err.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();

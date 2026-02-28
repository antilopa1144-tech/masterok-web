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
const createdDirs = new Set();

/**
 * Recursively create directory path on FTP server.
 * MKD only creates one level, so we need to create each segment.
 */
async function ensureDirManual(client, dirPath) {
  if (createdDirs.has(dirPath)) return;

  const segments = dirPath.split("/").filter(Boolean);
  let current = "";
  for (const segment of segments) {
    current += "/" + segment;
    if (createdDirs.has(current)) continue;
    try {
      await client.send(`MKD ${current}`);
    } catch {
      // already exists — ok
    }
    createdDirs.add(current);
  }
}

/**
 * Collect all files recursively from local directory.
 * Returns flat list of {localPath, remotePath} pairs.
 */
async function collectFiles(localDir, remoteDir) {
  const files = [];
  const entries = await readdir(localDir, { withFileTypes: true });

  for (const entry of entries) {
    const localPath = join(localDir, entry.name);
    const remotePath = posix.join(remoteDir, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await collectFiles(localPath, remotePath);
      files.push(...subFiles);
    } else {
      files.push({ localPath, remotePath });
    }
  }

  return files;
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
      console.log("Cleared.\n");
    } catch (err) {
      console.log(`Clear failed (${err.message}), will create dir.\n`);
    }

    // Ensure base dir exists
    await ensureDirManual(client, REMOTE_DIR);

    // Collect all files first
    console.log(`Scanning ${LOCAL_DIR}...`);
    const files = await collectFiles(LOCAL_DIR, REMOTE_DIR);
    console.log(`Found ${files.length} files to upload.\n`);

    // Upload each file
    for (const { localPath, remotePath } of files) {
      const stats = await stat(localPath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      process.stdout.write(`  ${remotePath} (${sizeKB} KB)...`);

      try {
        // Ensure target directory exists
        const dir = posix.dirname(remotePath);
        await ensureDirManual(client, dir);

        // cd to target dir + upload by filename
        await client.cd(dir);
        await client.uploadFrom(localPath, posix.basename(remotePath));
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

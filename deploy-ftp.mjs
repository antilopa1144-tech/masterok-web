/**
 * FTP Deploy Script for Masterok Web
 * Uploads contents of ./out/ to Timeweb hosting via FTP
 */
import { Client } from "basic-ftp";
import { readdir, stat } from "fs/promises";
import { join, posix } from "path";

// FTP credentials — set via environment variables
// Example: FTP_HOST=vh456.timeweb.ru FTP_USER=cm441996 FTP_PASSWORD=xxx node deploy-ftp.mjs
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

async function uploadDir(client, localDir, remoteDir) {
  const entries = await readdir(localDir, { withFileTypes: true });

  for (const entry of entries) {
    const localPath = join(localDir, entry.name);
    const remotePath = posix.join(remoteDir, entry.name);

    if (entry.isDirectory()) {
      // Create remote directory
      try {
        await client.send(`MKD ${remotePath}`);
      } catch {
        // directory already exists — ok
      }
      await uploadDir(client, localPath, remotePath);
    } else {
      const stats = await stat(localPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      process.stdout.write(`  ${remotePath} (${sizeMB} MB)...`);
      try {
        // Always cd to target directory first, then upload by filename
        const dir = posix.dirname(remotePath);
        const filename = posix.basename(remotePath);
        await client.cd(dir);
        await client.uploadFrom(localPath, filename);
        uploadedCount++;
        console.log(" ✓");
      } catch (err) {
        failedCount++;
        console.log(` ✗ ${err.message}`);
      }
    }
  }
}

async function removeDir(client, remoteDir) {
  try {
    await client.cd(remoteDir);
    const list = await client.list();

    for (const item of list) {
      const itemPath = posix.join(remoteDir, item.name);
      if (item.isDirectory) {
        await removeDir(client, itemPath);
      } else {
        await client.remove(itemPath);
      }
    }

    await client.cd("/");
    await client.removeDir(remoteDir);
  } catch {
    // directory doesn't exist or already empty — ok
  }
}

async function main() {
  const client = new Client();
  client.ftp.verbose = false;

  try {
    console.log(`Connecting to ${CONFIG.host}...`);
    await client.access(CONFIG);
    console.log("Connected!\n");

    // Verify we can reach the remote directory
    const pwd = await client.pwd();
    console.log(`FTP root: ${pwd}`);

    // Clear remote directory contents
    console.log(`Clearing ${REMOTE_DIR}...`);
    try {
      await client.cd(REMOTE_DIR);
      await client.clearWorkingDir();
      console.log("Cleared.\n");
    } catch (err) {
      console.log(`Clear failed (${err.message}), creating dir...`);
      try {
        await client.ensureDir(REMOTE_DIR);
        console.log("Created remote dir.\n");
      } catch (err2) {
        console.error(`Cannot create ${REMOTE_DIR}: ${err2.message}`);
        process.exit(1);
      }
    }

    // Reset to root before uploading
    await client.cd("/");

    console.log(`Uploading ${LOCAL_DIR} → ${REMOTE_DIR}...\n`);
    await uploadDir(client, LOCAL_DIR, REMOTE_DIR);

    // Verify upload
    await client.cd(REMOTE_DIR);
    const remoteFiles = await client.list();

    console.log(`\n--- Deploy Summary ---`);
    console.log(`Uploaded: ${uploadedCount} files`);
    console.log(`Failed:   ${failedCount} files`);
    console.log(`Remote ${REMOTE_DIR}/ contains: ${remoteFiles.length} items`);

    if (failedCount > 0) {
      console.error(`\n⚠️  ${failedCount} files failed to upload!`);
      process.exit(1);
    }

    if (remoteFiles.length === 0) {
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

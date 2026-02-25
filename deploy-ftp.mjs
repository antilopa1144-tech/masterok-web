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

async function uploadDir(client, localDir, remoteDir) {
  const entries = await readdir(localDir, { withFileTypes: true });

  for (const entry of entries) {
    const localPath = join(localDir, entry.name);
    const remotePath = posix.join(remoteDir, entry.name);

    if (entry.isDirectory()) {
      try {
        await client.ensureDir(remotePath);
      } catch {
        // dir may already exist
      }
      await uploadDir(client, localPath, remotePath);
      await client.cd("/"); // reset to root after ensureDir
    } else {
      const stats = await stat(localPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      process.stdout.write(`  ${remotePath} (${sizeMB} MB)...`);
      try {
        await client.uploadFrom(localPath, remotePath);
        console.log(" ✓");
      } catch (err) {
        console.log(` ✗ ${err.message}`);
      }
    }
  }
}

async function main() {
  const client = new Client();
  client.ftp.verbose = false;

  try {
    console.log(`Connecting to ${CONFIG.host}...`);
    await client.access(CONFIG);
    console.log("Connected!\n");

    // Clear remote directory first
    console.log(`Clearing ${REMOTE_DIR}...`);
    try {
      await client.cd(REMOTE_DIR);
      await client.clearWorkingDir();
      console.log("Cleared.\n");
    } catch {
      await client.ensureDir(REMOTE_DIR);
      console.log("Created remote dir.\n");
    }

    console.log(`Uploading ${LOCAL_DIR} → ${REMOTE_DIR}...\n`);
    await uploadDir(client, LOCAL_DIR, REMOTE_DIR);

    console.log("\n✅ Deploy complete!");
  } catch (err) {
    console.error("Deploy failed:", err.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();

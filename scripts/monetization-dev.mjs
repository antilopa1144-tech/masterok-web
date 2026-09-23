import { mkdirSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const port = Number(process.env.COMMERCE_DEV_PORT ?? 3460);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("COMMERCE_DEV_PORT must be 1024..65535");
const localDataDir = path.join(process.cwd(), ".commerce-data", "local");
mkdirSync(localDataDir, { recursive: true });

// This command is always a local simulator, even if the shell contains live settings.
const environment = {
  ...process.env,
  COMMERCE_DEV_ASSET_VERSION: `commerce-${Date.now()}`,
  MONETIZATION_MODE: "local",
  COMMERCE_ORIGIN: `http://localhost:${port}`,
  COMMERCE_DATABASE_URL: "",
  COMMERCE_ALLOW_LIVE_PAYMENTS: "false",
  COMMERCE_AUTH_SECRET: process.env.COMMERCE_AUTH_SECRET ?? "local-dev-auth-secret-32-characters",
  COMMERCE_ADMIN_EMAILS: process.env.COMMERCE_ADMIN_EMAILS ?? "owner@masterok.test",
  COMMERCE_LOCAL_DATA_DIR: process.env.COMMERCE_LOCAL_DATA_DIR ?? localDataDir,
};

const next = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [next, "dev", "-H", "127.0.0.1", "-p", String(port)], {
  cwd: process.cwd(), env: environment, stdio: "inherit",
});

child.on("exit", (code, signal) => process.exitCode = code ?? (signal ? 1 : 0));
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });

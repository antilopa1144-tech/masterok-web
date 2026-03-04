/**
 * CI deploy helper for Masterok Web.
 *
 * Strategy:
 * 1) Run tests (unless --skip-tests)
 * 2) Ensure local git state is safe for deploy
 * 3) Push local main -> origin/main (if ahead)
 * 4) Trigger GitHub Actions deploy workflow (if token provided)
 *
 * Required token for manual workflow dispatch:
 *   - GITHUB_TOKEN or GH_TOKEN (repo scope)
 */
import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const shouldShowHelp = args.has("--help") || args.has("-h");
const shouldSkipTests = args.has("--skip-tests");
const shouldWait = !args.has("--no-wait");

function printHelp() {
  console.log("Usage: node deploy-ci.mjs [options]");
  console.log("");
  console.log("Options:");
  console.log("  --skip-tests   Skip npm test before deploy");
  console.log("  --no-wait      Don't wait for GitHub Actions run completion");
  console.log("  -h, --help     Show this help");
  console.log("");
  console.log("Environment:");
  console.log("  GITHUB_TOKEN or GH_TOKEN - required for manual workflow_dispatch");
}

function run(cmd, cmdArgs, options = {}) {
  const result = spawnSync(cmd, cmdArgs, {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    const details = [stderr, stdout].filter(Boolean).join("\n");
    throw new Error(`Command failed: ${cmd} ${cmdArgs.join(" ")}\n${details}`);
  }

  return (result.stdout || "").trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRepoFromOriginUrl(originUrl) {
  // HTTPS: https://github.com/owner/repo.git
  // SSH:   git@github.com:owner/repo.git
  let repoPath = "";

  if (originUrl.startsWith("https://github.com/")) {
    repoPath = originUrl.replace("https://github.com/", "");
  } else if (originUrl.startsWith("git@github.com:")) {
    repoPath = originUrl.replace("git@github.com:", "");
  } else {
    throw new Error(`Unsupported origin URL: ${originUrl}`);
  }

  repoPath = repoPath.replace(/\.git$/, "");
  const [owner, repo] = repoPath.split("/");

  if (!owner || !repo) {
    throw new Error(`Cannot parse owner/repo from origin URL: ${originUrl}`);
  }

  return { owner, repo };
}

async function githubRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });

  return response;
}

async function waitForWorkflowRun({ owner, repo, token, sinceIso }) {
  const maxAttempts = 24; // ~2 minutes

  for (let i = 0; i < maxAttempts; i++) {
    const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/deploy.yml/runs?event=workflow_dispatch&branch=main&per_page=10`;
    const res = await githubRequest(url, token);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Cannot list workflow runs: ${res.status} ${body}`);
    }

    const data = await res.json();
    const run = (data.workflow_runs || []).find((r) => r.created_at >= sinceIso);

    if (run) {
      return run;
    }

    await sleep(5000);
  }

  return null;
}

async function waitForRunCompletion({ owner, repo, token, runId }) {
  const maxAttempts = 120; // ~10 minutes

  for (let i = 0; i < maxAttempts; i++) {
    const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`;
    const res = await githubRequest(url, token);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Cannot read run status: ${res.status} ${body}`);
    }

    const run = await res.json();
    process.stdout.write(`\rRun status: ${run.status}${run.conclusion ? ` (${run.conclusion})` : ""}     `);

    if (run.status === "completed") {
      process.stdout.write("\n");
      return run;
    }

    await sleep(5000);
  }

  process.stdout.write("\n");
  throw new Error("Timeout waiting for workflow completion");
}

async function main() {
  if (shouldShowHelp) {
    printHelp();
    return;
  }

  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

  console.log("Step 1/5: Git sanity checks...");
  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch !== "main") {
    throw new Error(`Deploy allowed only from 'main'. Current branch: ${branch}`);
  }

  const status = run("git", ["status", "--porcelain"]);
  if (status) {
    throw new Error("Working tree is not clean. Commit/stash changes before deploy.");
  }

  console.log("Step 2/5: Sync check with origin...");
  run("git", ["fetch", "--prune", "origin"]);
  const counts = run("git", ["rev-list", "--left-right", "--count", "main...origin/main"]);
  const [aheadStr, behindStr] = counts.split(/\s+/);
  const ahead = Number(aheadStr || "0");
  const behind = Number(behindStr || "0");

  if (behind > 0) {
    throw new Error(`Local main is behind origin/main by ${behind} commit(s). Pull/rebase first.`);
  }

  if (!shouldSkipTests) {
    console.log("Step 3/5: Run tests...");
    run(npmCmd, ["test"]);
  } else {
    console.log("Step 3/5: Tests skipped (--skip-tests).");
  }

  if (ahead > 0) {
    console.log(`Step 4/5: Push ${ahead} local commit(s) to origin/main...`);
    run("git", ["push", "origin", "main"]);
  } else {
    console.log("Step 4/5: No local commits to push.");
  }

  const originUrl = run("git", ["remote", "get-url", "origin"]);
  const { owner, repo } = getRepoFromOriginUrl(originUrl);
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const actionsUrl = `https://github.com/${owner}/${repo}/actions/workflows/deploy.yml`;

  if (!token) {
    if (ahead > 0) {
      console.log("Step 5/5: No GITHUB_TOKEN/GH_TOKEN. Deploy should start automatically by push trigger.");
      console.log(`Track deploy: ${actionsUrl}`);
      return;
    }

    throw new Error(
      "No new commits to push and no GITHUB_TOKEN/GH_TOKEN for workflow_dispatch. " +
      "Set token to trigger deploy manually from script."
    );
  }

  console.log("Step 5/5: Trigger workflow_dispatch deploy...");
  const dispatchTimeIso = new Date().toISOString();
  const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/deploy.yml/dispatches`;
  const dispatchRes = await githubRequest(dispatchUrl, token, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: "main" }),
  });

  if (dispatchRes.status !== 204) {
    const body = await dispatchRes.text();
    throw new Error(`Workflow dispatch failed: ${dispatchRes.status} ${body}`);
  }

  console.log("Workflow dispatched.");
  console.log(`Track deploy: ${actionsUrl}`);

  if (!shouldWait) {
    return;
  }

  console.log("Waiting for run to appear...");
  const runInfo = await waitForWorkflowRun({
    owner,
    repo,
    token,
    sinceIso: dispatchTimeIso,
  });

  if (!runInfo) {
    console.log("Run not detected yet. Open Actions URL and monitor manually.");
    return;
  }

  console.log(`Run detected: #${runInfo.run_number}`);
  console.log(`Run URL: ${runInfo.html_url}`);
  console.log("Waiting for completion...");

  const finalRun = await waitForRunCompletion({
    owner,
    repo,
    token,
    runId: runInfo.id,
  });

  if (finalRun.conclusion !== "success") {
    throw new Error(`Deploy workflow finished with conclusion: ${finalRun.conclusion}. See ${finalRun.html_url}`);
  }

  console.log("✅ Deploy completed successfully.");
}

main().catch((error) => {
  console.error(`\nDeploy error: ${error.message}`);
  process.exit(1);
});


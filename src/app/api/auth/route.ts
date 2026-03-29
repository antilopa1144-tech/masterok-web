/**
 * GitHub OAuth proxy for Decap CMS.
 * Handles the authorization code exchange — required because GitHub OAuth
 * does not support PKCE for OAuth Apps (only for GitHub Apps).
 *
 * Flow:
 *   1. /api/auth?provider=github          → redirect to GitHub authorize
 *   2. /api/auth?code=...&state=...       → exchange code for token, return HTML
 */
import { NextRequest, NextResponse } from "next/server";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmasterok.ru";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const provider = searchParams.get("provider");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const scope = searchParams.get("scope") ?? "repo,user";

  // Step 1: redirect to GitHub
  if (provider === "github" && !code) {
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: `${SITE_URL}/api/auth`,
      scope,
      state: state ?? crypto.randomUUID(),
    });
    return NextResponse.redirect(
      `https://github.com/login/oauth/authorize?${params}`
    );
  }

  // Step 2: exchange code for token
  if (code) {
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          state,
        }),
      }
    );

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (tokenData.error || !tokenData.access_token) {
      return new NextResponse(
        renderScript("error", tokenData.error ?? "unknown_error"),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    return new NextResponse(
      renderScript("success", tokenData.access_token, "github"),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return new NextResponse("Bad request", { status: 400 });
}

/**
 * Sends result back to Decap CMS via postMessage (same pattern as Netlify Identity).
 */
function renderScript(
  status: "success" | "error",
  content: string,
  provider?: string
) {
  const message =
    status === "success"
      ? `authorization:${provider}:success:${JSON.stringify({ token: content, provider })}`
      : `authorization:github:error:${content}`;

  return `<!DOCTYPE html><html><body><script>
    (function() {
      function receiveMessage(e) {
        window.opener.postMessage(
          'authorizing:github',
          e.origin
        );
        window.opener.postMessage(
          ${JSON.stringify(message)},
          e.origin
        );
      }
      window.addEventListener("message", receiveMessage, false);
      window.opener.postMessage("authorizing:github", "*");
    })();
  </script></body></html>`;
}

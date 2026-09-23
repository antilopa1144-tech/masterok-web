import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

process.env.MONETIZATION_MODE = "local";
process.env.COMMERCE_LOCAL_DATA_DIR = "memory://";
process.env.COMMERCE_AUTH_SECRET = "test-commerce-secret-that-is-long-enough";

import { assertSameOrigin, requestLogin, verifyLogin } from "./auth";
import { closeCommerceDatabase, database } from "./db";

beforeAll(async () => { await database(); });
afterAll(async () => { await closeCommerceDatabase(); });

describe("commerce OTP and CSRF", () => {
  it("accepts a local OTP once and rejects its replay", async () => {
    const login = await requestLogin("one-use@example.test", "127.0.0.1");
    expect(login.localCode).toMatch(/^\d{6}$/);
    await expect(verifyLogin(login.challenge, login.localCode)).resolves.toMatchObject({ user: { email: "one-use@example.test" } });
    await expect(verifyLogin(login.challenge, login.localCode)).rejects.toMatchObject({ status: 400 });
  });

  it("persists wrong attempts and refuses expired challenges", async () => {
    const login = await requestLogin("attempts@example.test", "127.0.0.2");
    for (let i = 0; i < 5; i++) await expect(verifyLogin(login.challenge, "000000")).rejects.toMatchObject({ status: 400 });
    await expect(verifyLogin(login.challenge, login.localCode)).rejects.toMatchObject({ status: 400 });
    const db = await database();
    await db.query("UPDATE commerce_codes SET expires_at=$1 WHERE id=$2", [Date.now() - 1, login.challenge]);
    await expect(verifyLogin(login.challenge, login.localCode)).rejects.toMatchObject({ status: 400 });
  });

  it("requires the configured same origin for state-changing requests", () => {
    expect(() => assertSameOrigin(new Request("http://localhost:3460/api", { headers: { origin: "https://evil.example" } }))).toThrow(/Запрос должен быть/);
    expect(() => assertSameOrigin(new Request("http://localhost:3460/api", { headers: { origin: "http://localhost:3460" } }))).not.toThrow();
  });

  it("sends a login code through the configured mail API outside local mode", async () => {
    const oldMode = process.env.MONETIZATION_MODE;
    const oldKey = process.env.RESEND_API_KEY;
    const oldFrom = process.env.COMMERCE_MAIL_FROM;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    try {
      process.env.MONETIZATION_MODE = "sandbox";
      process.env.RESEND_API_KEY = "test-key";
      process.env.COMMERCE_MAIL_FROM = "Мастерок <login@example.test>";
      const result = await requestLogin("buyer@example.test", "127.0.0.3");
      expect(result.localCode).toBeUndefined();
      expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
      const request = fetchMock.mock.calls[0][1] as RequestInit;
      expect(JSON.parse(String(request.body))).toMatchObject({ to: ["buyer@example.test"], from: "Мастерок <login@example.test>" });
    } finally {
      fetchMock.mockRestore();
      if (oldMode === undefined) delete process.env.MONETIZATION_MODE; else process.env.MONETIZATION_MODE = oldMode;
      if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey;
      if (oldFrom === undefined) delete process.env.COMMERCE_MAIL_FROM; else process.env.COMMERCE_MAIL_FROM = oldFrom;
    }
  });
});

import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { postgresCommerceSchema } from "./db";

describe("разделение тестовых и рабочих заказов", () => {
  it("хранит одноимённые таблицы в разных схемах одного PostgreSQL", async () => {
    const db = new PGlite();
    const sandbox = postgresCommerceSchema("sandbox");
    const live = postgresCommerceSchema("live");
    expect(sandbox).not.toBe(live);
    expect(postgresCommerceSchema("off")).toBe(sandbox);

    try {
      for (const [schema, order] of [[sandbox, "test-order"], [live, "customer-order"]]) {
        await db.exec(`CREATE SCHEMA ${schema}; SET search_path TO ${schema}; CREATE TABLE commerce_orders (id text PRIMARY KEY)`);
        await db.query("INSERT INTO commerce_orders(id) VALUES($1)", [order]);
      }

      await db.exec(`SET search_path TO ${sandbox}`);
      expect((await db.query<{ id: string }>("SELECT id FROM commerce_orders")).rows).toEqual([{ id: "test-order" }]);
      await db.exec(`SET search_path TO ${live}`);
      expect((await db.query<{ id: string }>("SELECT id FROM commerce_orders")).rows).toEqual([{ id: "customer-order" }]);
    } finally {
      await db.close();
    }
  });
});

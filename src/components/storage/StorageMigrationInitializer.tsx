"use client";

import { useEffect } from "react";
import { migrateLegacyStorage } from "@/lib/storage/migration";

export default function StorageMigrationInitializer() {
  useEffect(() => {
    const run = () => {
      void migrateLegacyStorage();
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: 4000 });
      return () => cancelIdleCallback(id);
    }
    const timer = setTimeout(run, 1);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

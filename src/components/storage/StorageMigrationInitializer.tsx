"use client";

import { useEffect } from "react";
import { migrateLegacyStorage } from "@/lib/storage/migration";

export default function StorageMigrationInitializer() {
  useEffect(() => {
    void migrateLegacyStorage();
  }, []);

  return null;
}

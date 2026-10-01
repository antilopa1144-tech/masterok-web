"use client";

import { useEffect, useRef } from "react";
import type { FloorSpec } from "@/lib/constructor/core";
import { decorFor } from "@/lib/constructor/presentation";
import { createWoodCanvas, loadWoodCanvas } from "./wood-texture";
import styles from "./constructor.module.css";

export default function MaterialSwatch({ decor, className = styles.swatch }: { decor: FloorSpec["decor"]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const palette = decorFor(decor);
    canvas.width = 512; canvas.height = 128;
    const context = canvas.getContext("2d");
    context?.drawImage(createWoodCanvas(palette, 512, 128), 0, 0);
    let cancelled = false;
    void loadWoodCanvas(palette).then((sample) => { if (!cancelled) context?.drawImage(sample, 0, 0, 512, 128); });
    return () => { cancelled = true; };
  }, [decor]);
  return <span className={className} style={{ backgroundColor: decorFor(decor).color }} aria-hidden="true"><canvas ref={ref} /></span>;
}

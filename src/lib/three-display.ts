/** DPR для WebGL: на touch/узком экране ниже — меньше нагрузка на GPU и TBT. */
export function getRendererPixelRatio(): number {
  if (typeof window === "undefined") return 1;
  const dpr = window.devicePixelRatio || 1;
  const mobileLike =
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 767px)").matches;
  if (mobileLike) return Math.min(dpr, 1.25);
  return Math.min(dpr, 2);
}

"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/** A point in the SVG's own coordinates, requested by a distinct user action. */
export interface DrawingFocus {
  token: number;
  x: number;
  y: number;
  reveal?: boolean;
}

export function useDrawingViewport({ focus, resetKey }: { focus?: DrawingFocus; resetKey?: unknown } = {}) {
  const drawing = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [sizeRevision, setSizeRevision] = useState(0);
  const [panning, setPanning] = useState(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number }>();
  const dragged = useRef(false);
  const focusedToken = useRef(0);
  const zoomFrame = useRef<number>();
  const focusFrame = useRef<number>();
  const token = focus?.token, x = focus?.x, y = focus?.y, reveal = focus?.reveal;

  const cancelZoom = () => { if (zoomFrame.current !== undefined) cancelAnimationFrame(zoomFrame.current); };
  const cancelFocus = () => { if (focusFrame.current !== undefined) cancelAnimationFrame(focusFrame.current); };

  useEffect(() => {
    cancelZoom(); cancelFocus(); focusedToken.current = 0;
    setZoom(1); drawing.current?.scrollTo(0, 0);
  }, [resetKey]);

  useEffect(() => {
    const container = drawing.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    let width = 0, height = 0;
    const observer = new ResizeObserver(() => {
      // A hidden mobile section cannot be focused until it has a size again.
      if (!container.clientWidth || !container.clientHeight) return;
      if (width === container.clientWidth && height === container.clientHeight) return;
      width = container.clientWidth; height = container.clientHeight;
      setSizeRevision((value) => value + 1);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!token || x === undefined || y === undefined || focusedToken.current === token) return;
    cancelZoom(); setZoom(4);
  }, [token, x, y]);

  useEffect(() => {
    if (!token || x === undefined || y === undefined || zoom !== 4 || focusedToken.current === token) return;
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = requestAnimationFrame(() => {
        const container = drawing.current, matrix = container?.querySelector("svg")?.getScreenCTM();
        if (!container?.clientWidth || !container.clientHeight || !matrix) return;
        const point = new DOMPoint(x, y).matrixTransform(matrix), box = container.getBoundingClientRect();
        container.scrollBy(point.x - box.left - container.clientWidth / 2, point.y - box.top - container.clientHeight / 2);
        if (reveal) container.scrollIntoView({ block: "nearest", inline: "nearest" });
        container.focus({ preventScroll: true }); focusedToken.current = token;
      });
    });
    return cancelFocus;
  }, [token, x, y, zoom, sizeRevision, reveal]);

  useEffect(() => () => { cancelZoom(); cancelFocus(); }, []);

  const changeZoom = (value: number) => {
    const next = Math.max(1, Math.min(4, value));
    if (next === zoom) return;
    cancelZoom(); cancelFocus(); focusedToken.current = token ?? 0;
    const container = drawing.current, ratio = next / zoom;
    const left = container ? (container.scrollLeft + container.clientWidth / 2) * ratio - container.clientWidth / 2 : 0;
    const top = container ? (container.scrollTop + container.clientHeight / 2) * ratio - container.clientHeight / 2 : 0;
    setZoom(next);
    zoomFrame.current = requestAnimationFrame(() => {
      zoomFrame.current = requestAnimationFrame(() => { container?.scrollTo(Math.max(0, left), Math.max(0, top)); });
    });
  };
  const fit = () => {
    cancelZoom(); cancelFocus(); focusedToken.current = token ?? 0;
    setZoom(1); drawing.current?.scrollTo(0, 0);
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragged.current = false;
    if (zoom <= 1 || event.pointerType === "touch" || event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
    event.currentTarget.focus({ preventScroll: true });
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current; if (!start) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (!dragged.current && Math.abs(dx) + Math.abs(dy) > 4) {
      dragged.current = true; setPanning(true); event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (dragged.current) { event.currentTarget.scrollLeft = start.left - dx; event.currentTarget.scrollTop = start.top - dy; }
  };
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = undefined; setPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const isPanClick = () => { const value = dragged.current; dragged.current = false; return value; };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) return;
    if (["+", "=", "-", "0", "Home"].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      if (event.key === "0" || event.key === "Home") fit();
      else changeZoom(zoom + (event.key === "-" ? -.5 : .5));
    } else if (zoom > 1 && event.key.startsWith("Arrow")) {
      event.preventDefault();
      event.currentTarget.scrollBy(event.key === "ArrowRight" ? 60 : event.key === "ArrowLeft" ? -60 : 0, event.key === "ArrowDown" ? 60 : event.key === "ArrowUp" ? -60 : 0);
    }
  };

  return {
    drawing, zoom, panning, changeZoom, fit, isPanClick,
    handlers: {
      onPointerDown: pointerDown, onPointerMove: pointerMove, onPointerUp: pointerUp,
      onPointerCancel: (event: PointerEvent<HTMLDivElement>) => { pointerUp(event); dragged.current = false; },
      onPointerLeave: () => { if (!dragged.current) drag.current = undefined; },
      onKeyDown: keyDown,
    },
  };
}

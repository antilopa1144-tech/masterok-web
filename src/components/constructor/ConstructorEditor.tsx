"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { Box, Check, ChevronDown, Copy, Download, FileInput, FolderOpen, Grid2X2, Home, Layers, Maximize2, Move, Plus, Redo2, Ruler, Scissors, ShoppingCart, Square, Trash2, Undo2, X, ZoomIn, ZoomOut, Pencil, Scan } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { calculateProject, createFloorTileSpec, tileSupplyArea, validateProject, MAX_FURNISHINGS_PER_ROOM, type ConstructorRoom, type FloorSpec, type FurnishingDimensions, type FurnishingPosition, type Opening, type ProjectCalculation, type RoomCalculation, type Wall, type WallTileSpec, type TileRect } from "@/lib/constructor/core";
import { dimensionsFor, furnishingIssues, furnishingName, interiorFor, interiorWithPosition, interiorWithDimensions, interiorWithAddedItem, interiorWithoutItem, layoutFurnishings, rotatedFurnishingPosition } from "@/lib/constructor/interiors";
import { cloneValue, commitWorkspace, createWorkspace, MAX_VARIANTS, newId, readWorkspaceFile, redoWorkspace, undoWorkspace, type ConstructorWorkspace, type WorkspaceHistory } from "@/lib/constructor/workspace";
import { listWorkspaces, loadWorkspace, saveWorkspace, type WorkspaceSummary } from "@/lib/constructor/storage";
import { CONSTRUCTOR_EDITOR_URL, parseConstructorEntry } from "@/lib/constructor/entry";
import { createScenarioWorkspace } from "@/lib/constructor/scenarios";
import { ConstructorJourney } from "@/lib/constructor/journey";
import { trackEvent } from "@/lib/analytics";
import ConstructorQuickStart from "./ConstructorQuickStart";
import { DECORS, formatMoney, formatNumber } from "@/lib/constructor/presentation";
import { LAMINATE_SIZE_PRESETS } from "@/lib/tools/laminate-layout";
import { NumberField, TextField } from "./DraftFields";
import PlanView from "./PlanView";
import CutView from "./CutView";
import MaterialSwatch from "./MaterialSwatch";
import ResizableSheetHandle from "./ResizableSheetHandle";
import WallElevation from "./WallElevation";
import WallTileInspector from "./WallTileInspector";
import VariantComparison from "./VariantComparison";
import WallCutReview from "./WallCutReview";
import WallLayoutPreview from "./WallLayoutPreview";
import RoomInteriorControls, { RoomTypeIcon } from "./RoomInteriorControls";
import RoomCreationForm from "./RoomCreationForm";
import FurnishingPlacementControls from "./FurnishingPlacementControls";
import SceneFurnishingControls from "./SceneFurnishingControls";
import FloorTileInspector from "./FloorTileInspector";
import InspectorSection from "./InspectorSection";
import TileSupplyControls from "./TileSupplyControls";
import { reviewWallCuts, type WallCutEntry } from "@/lib/constructor/wall-cuts";
import styles from "./constructor.module.css";
import { summarizeFinish } from "@/lib/constructor/comparison";
import { purchaseCostText, purchaseFacts } from "@/lib/constructor/purchase-presentation";

const RoomScene = dynamic(() => import("./RoomScene"), { ssr: false, loading: () => <div className={styles.sceneLoading}>Загружаем 3D…</div> });

type Tab = "room" | "interior" | "floor" | "walls";
type View = "3d" | "plan" | "cuts" | "elevation";
type Modal = "purchase" | "variants" | "projects" | "remove-room" | "wall-cuts" | "wall-layout" | "add-room" | null;
type TileSelection = { roomId: string; wall: Wall; tileId: string; calculation: RoomCalculation; focusToken: number; bounds?: TileRect };
const BOARD_FORMATS = LAMINATE_SIZE_PRESETS.filter((format) => !format.label.includes("ёлочка"));
const GUIDE_DISMISSED_KEY = "masterok.constructor.quick-start.dismissed.v1";
function guideAllowed() {
  try { return window.localStorage.getItem(GUIDE_DISMISSED_KEY) !== "1"; }
  catch { return true; }
}

function PatternSketch({ pattern }: { pattern: FloorSpec["pattern"] }) {
  return <svg viewBox="0 0 120 48" aria-hidden="true"><rect x="1" y="1" width="118" height="46" rx="3" fill="currentColor" opacity=".09" /><path d={pattern === "third" ? "M0 16h120M0 32h120M40 0v16M100 0v16M20 16v16M80 16v16M60 32v16" : "M0 16h120M0 32h120M30 0v16M90 0v16M60 16v16M30 32v16M90 32v16"} fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

function IconButton({ label, children, onClick, disabled = false }: { label: string; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button className={styles.iconButton} type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>;
}

function ModalWindow({ title, children, onClose, wide = false, aboveNotice = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; aboveNotice?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(ref.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex='0']") ?? []);
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); if (previous?.isConnected) previous.focus(); };
  }, []);
  const titleId = "constructor-modal-title";
  return <div className={`${styles.modalBackdrop} ${aboveNotice ? styles.roomBackdrop : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={ref} tabIndex={-1} className={`${styles.modal} ${wide ? styles.comparisonModal : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={styles.modalHeader}><h2 id={titleId}>{title}</h2><IconButton label="Закрыть окно" onClick={onClose}><X size={21} /></IconButton></div>{children}
    </div>
  </div>;
}

export default function ConstructorEditor() {
  const router = useRouter();
  const journey = useRef(new ConstructorJourney());
  const [guideVisible, setGuideVisible] = useState(false);
  const [history, setHistory] = useState<WorkspaceHistory | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [tab, setTab] = useState<Tab>("floor");
  const [selectedWall, setSelectedWall] = useState<Wall>(0);
  const [selectedTile, setSelectedTile] = useState<TileSelection>();
  const tileFocusToken = useRef(0);
  const [layoutResetToken, setLayoutResetToken] = useState(0);
  const [view, setView] = useState<View>("3d");
  const [panel, setPanel] = useState<"properties" | "tree" | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const togglePanel = useCallback(() => { setPanelHeight(null); setPanelExpanded((current) => !current); }, []);
  const resizePanel = useCallback((height: number) => { setPanelHeight(height); setPanelExpanded(height > Math.min(window.innerHeight * .57, 590) + 24); }, []);
  const [modal, setModal] = useState<Modal>(null);
  const [saved, setSaved] = useState<"loading" | "pending" | "saved" | "error" | "invalid">("loading");
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [exportMenu, setExportMenu] = useState(false);
  const [busyExport, setBusyExport] = useState("");
  const [numbers, setNumbers] = useState(false);
  const [allWalls, setAllWalls] = useState(false);
  const [furnished, setFurnished] = useState(true);
  const [arrangement, setArrangement] = useState(false);
  const [movingFurnishing, setMovingFurnishing] = useState(false);
  const [selectedFurnishing, setSelectedFurnishing] = useState<string>();
  const [placementGesture, setPlacementGesture] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [sceneActions, setSceneActions] = useState<{ zoomIn: () => void; zoomOut: () => void; topView: () => void } | null>(null);
  const sceneControlsReady = useCallback((actions: { zoomIn: () => void; zoomOut: () => void; topView: () => void } | null) => setSceneActions(actions), []);
  const [customFormat, setCustomFormat] = useState(false);
  const [selectedPieceId, setSelectedPieceId] = useState<string>();
  const [projects, setProjects] = useState<WorkspaceSummary[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const capture = useRef<(() => string) | null>(null);
  const captureReady = useCallback((next: (() => string) | null) => { capture.current = next; }, []);
  const savingQueue = useRef<Promise<void>>(Promise.resolve());
  const saveRevision = useRef(0);
  const lastSavedWorkspace = useRef<ConstructorWorkspace | null>(null);
  const comparisonSelection = useRef<Record<string, string[]>>({});
  const workspace = history?.present;

  useEffect(() => {
    let cancelled = false;
    const entry = parseConstructorEntry(window.location.search);
    const initialWorkspace = entry.scenario ? Promise.resolve(createScenarioWorkspace(entry.scenario)) : loadWorkspace(entry.projectId);
    initialWorkspace.then((restored) => {
      if (cancelled) return;
      const initial = restored ?? createWorkspace(); setHistory({ present: initial, past: [], future: [] });
      journey.current.open(initial.project, entry.scenario || !restored ? "new" : "resume", entry.scenario);
      setGuideVisible(!!(entry.scenario || !restored) && guideAllowed());
      setSelectedRoomId(initial.project.rooms[0]?.id ?? ""); setSaved("pending");
      if (entry.scenario === "bathroom") setTab("walls");
      if (entry.scenario === "room") setTab("room");
      if (entry.projectId && !restored) setNotice("Проект не найден в этом браузере. Откройте сохранённый файл через меню «Экспорт» → «Импортировать проект».");
    }).catch((error: Error) => {
      if (cancelled) return;
      const initial = createWorkspace(); setHistory({ present: initial, past: [], future: [] }); setSelectedRoomId(initial.project.rooms[0]?.id ?? "");
      journey.current.open(initial.project, "new"); setGuideVisible(guideAllowed());
      setNotice(error.message); setSaved("error");
    });
    return () => { cancelled = true; };
  }, []);

  const validation = useMemo(() => workspace ? validateProject(workspace.project) : [], [workspace]);
  const computation = useMemo<{ value: ProjectCalculation | null; error: string }>(() => {
    if (!workspace || validation.length) return { value: null, error: validation.join(" ") };
    try { return { value: calculateProject(workspace.project), error: "" }; }
    catch (error) { return { value: null, error: error instanceof Error ? error.message : "Не удалось рассчитать проект." }; }
  }, [workspace, validation]);
  const result = computation.value;
  useEffect(() => { if (workspace && result) journey.current.observe(workspace.project); }, [workspace, result]);
  const room = workspace?.project.rooms.find((item) => item.id === selectedRoomId) ?? workspace?.project.rooms[0];
  const roomResult = result?.rooms.find((item) => item.roomId === room?.id);
  const wallResult = roomResult?.walls.find((item) => item.wall === selectedWall);
  const wallCutEntries = useMemo(() => reviewWallCuts(roomResult?.walls ?? []), [roomResult]);
  const activeTileSelection = selectedTile?.roomId === room?.id && selectedTile?.wall === selectedWall && selectedTile?.calculation === roomResult ? selectedTile : undefined;
  const pendingDraft = Object.values(drafts)[0];
  const activeFurnishing = room && selectedFurnishing && interiorFor(room).items.some((item) => item.id === selectedFurnishing) ? selectedFurnishing : undefined;
  const sceneFurnishing = useMemo(() => {
    if (!room || tab !== "interior" || !furnished || !activeFurnishing) return undefined;
    const interior = interiorFor(room), layout = layoutFurnishings(room);
    const item = interior.items.find((item) => item.id === activeFurnishing)!;
    return { id: item.id, name: furnishingName(room, item.id), dimensions: dimensionsFor(item), placed: layout.placements.some((placement) => placement.id === item.id), atLimit: interior.items.length >= MAX_FURNISHINGS_PER_ROOM, hasIssues: furnishingIssues(room, layout).some((issue) => issue.id === item.id) };
  }, [room, tab, furnished, activeFurnishing]);
  const arranging = arrangement && view === "plan" && furnished;
  const hasPendingDraft = !!pendingDraft;
  const movingFurnishingId = movingFurnishing && view === "3d" && sceneFurnishing?.placed && !hasPendingDraft ? sceneFurnishing.id : undefined;
  useEffect(() => { setMovingFurnishing(false); }, [room?.id, view, tab, furnished, activeFurnishing, hasPendingDraft]);
  const isSaved = saved === "saved" && lastSavedWorkspace.current === workspace && !pendingDraft && !placementGesture;
  const canExport = !!workspace && !!result && !pendingDraft && !placementGesture && !busyExport && workspace.project.rooms.length > 0;
  const dismissGuide = () => {
    setGuideVisible(false);
    try { window.localStorage.setItem(GUIDE_DISMISSED_KEY, "1"); } catch { /* The editor also works without preferences storage. */ }
  };
  const openPurchase = () => {
    if (!result || pendingDraft || placementGesture) return;
    journey.current.resultView(); setModal("purchase");
    if (guideVisible) dismissGuide();
  };
  useEffect(() => { setArrangement(false); setSelectedFurnishing(undefined); setPlacementGesture(false); }, [room?.id, workspace?.project.id]);
  const showTileCut = (entry: WallCutEntry) => {
    if (!room || !roomResult || pendingDraft) return;
    setSelectedWall(entry.wall); setView("elevation"); setTab("walls"); setPanel(null); setModal(null);
    setSelectedTile({ roomId: room.id, wall: entry.wall, tileId: entry.cell.id, calculation: roomResult, focusToken: ++tileFocusToken.current, bounds: entry.narrowestPart.bounds });
  };

  useEffect(() => {
    const revision = ++saveRevision.current;
    if (!workspace) return;
    if (validation.length) { setSaved("invalid"); return; }
    setSaved("pending");
    const timer = window.setTimeout(() => {
      const snapshot = cloneValue(workspace);
      savingQueue.current = savingQueue.current.catch(() => {}).then(async () => {
        try {
          await saveWorkspace(snapshot);
          if (revision === saveRevision.current) {
            lastSavedWorkspace.current = workspace; setSaved("saved");
            // Consume the start request only after persistence succeeds: reload resumes this exact project.
            const url = `${CONSTRUCTOR_EDITOR_URL}?project=${encodeURIComponent(workspace.project.id)}`;
            if (`${window.location.pathname}${window.location.search}` !== url) window.history.replaceState(null, "", url);
          }
        }
        catch (error) { if (revision === saveRevision.current) { setSaved("error"); setNotice(error instanceof Error ? error.message : "Проект не сохранён. Скачайте резервную копию."); } }
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [workspace, validation]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!isSaved) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isSaved]);

  const onStatus = useCallback((id: string, message: string | null) => setDrafts((previous) => {
    if (previous[id] === message || (!message && !(id in previous))) return previous;
    const next = { ...previous }; if (message) next[id] = message; else delete next[id]; return next;
  }), []);
  const commit = useCallback((update: (current: ConstructorWorkspace) => void) => setHistory((previous) => {
    if (!previous) return previous; const next = cloneValue(previous.present); update(next); return commitWorkspace(previous, next);
  }), []);
  const updateRoom = useCallback((update: (current: ConstructorRoom) => void) => {
    if (!room) return; commit((current) => { const selected = current.project.rooms.find((item) => item.id === room.id); if (selected) update(selected); });
  }, [room, commit]);
  const updateFloor = (field: keyof FloorSpec, value: FloorSpec[keyof FloorSpec]) => updateRoom((current) => { Object.assign(current.floor, { [field]: value }); });
  const updateWallTile = (spec: WallTileSpec | null) => updateRoom((current) => {
    if (spec && current.continuousWallTiles) current.wallTiles = [cloneValue(spec), cloneValue(spec), cloneValue(spec), cloneValue(spec)];
    else { current.wallTiles[selectedWall] = spec; if (!spec) current.continuousWallTiles = false; }
  });
  const applyTilesToAll = () => updateRoom((current) => { const spec = current.wallTiles[selectedWall]; if (spec) current.wallTiles = [cloneValue(spec), cloneValue(spec), cloneValue(spec), cloneValue(spec)]; });
  const setTileContinuation = (value: boolean) => updateRoom((current) => { const spec = current.wallTiles[selectedWall]; if (value && spec) current.wallTiles = [cloneValue(spec), cloneValue(spec), cloneValue(spec), cloneValue(spec)]; current.continuousWallTiles = value; });
  const applyLayoutPreview = (candidate: ConstructorWorkspace["project"], variantName?: string) => {
    if (!workspace || pendingDraft || validateProject(candidate).length) return;
    const name = variantName?.trim();
    if (variantName !== undefined && (!name || name.length > 120 || workspace.variants.length >= MAX_VARIANTS || workspace.variants.some((variant) => JSON.stringify(variant.rooms) === JSON.stringify(candidate.rooms)))) return;
    const id = name ? newId("variant") : undefined;
    commit((current) => {
      current.project.rooms = cloneValue(candidate.rooms);
      if (id && name) current.variants.push({ id, name, rooms: cloneValue(candidate.rooms), savedAt: new Date().toISOString() });
    });
    setModal(null); setView("elevation"); setTab("walls"); setPanel(null); setSelectedTile(undefined); setSelectedPieceId(undefined);
    setLayoutResetToken((value) => value + 1);
    setNotice(name ? `Вариант «${name}» сохранён, раскладка применена. Кнопка «Отменить действие» вернёт предыдущий проект.` : "Раскладка применена. Кнопка «Отменить действие» вернёт предыдущие настройки.");
  };
  const setRoomNumber = (field: "widthMm" | "lengthMm" | "heightMm", value: number) => updateRoom((current) => { current[field] = value; });
  const scrollPropertiesTo = (target: HTMLElement | null) => {
    const scroller = target?.closest<HTMLElement>(`.${styles.properties}`);
    if (!target || !scroller) return;
    scroller.scrollTop += target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 8;
  };
  const expandShortPanel = () => {
    if (window.matchMedia("(max-width: 980px)").matches && window.innerHeight < 740) { setPanelHeight(null); setPanelExpanded(true); }
  };
  const showRoomProperties = () => {
    expandShortPanel(); setSelectedFurnishing(undefined); setTab("room"); setPanel("properties");
    requestAnimationFrame(() => {
      const control = document.querySelector<HTMLInputElement>('input[type="range"][aria-label="Ширина"]');
      scrollPropertiesTo(control?.closest<HTMLElement>("[data-number-control]") ?? null); control?.focus({ preventScroll: true });
    });
  };
  const showInterior = () => {
    expandShortPanel(); setSelectedFurnishing(undefined); setTab("interior"); setPanel("properties"); requestAnimationFrame(() => {
      const control = document.querySelector<HTMLSelectElement>('select[aria-label="Тип помещения"]');
      scrollPropertiesTo(control?.closest<HTMLElement>("label") ?? null); control?.focus({ preventScroll: true });
    });
  };
  const showFurnishingProperties = () => {
    expandShortPanel(); setMovingFurnishing(false);
    setTab("interior"); setPanel("properties"); requestAnimationFrame(() => {
      const control = document.querySelector<HTMLSelectElement>('select[aria-label="Предмет для расстановки"]');
      const section = control?.closest<HTMLElement>("section"), scroller = control?.closest<HTMLElement>(`.${styles.properties}`);
      const fields = section?.querySelectorAll<HTMLElement>("[data-number-control]");
      const compact = !!(scroller && section && fields?.[2] && fields[2].getBoundingClientRect().bottom - section.getBoundingClientRect().top > scroller.clientHeight - 12);
      scrollPropertiesTo(compact ? fields?.[0] ?? null : section ?? null);
      (compact ? fields?.[0]?.querySelector<HTMLInputElement>('input[type="range"]') : control)?.focus({ preventScroll: true });
    });
  };
  const finishMovingFurnishing = () => {
    setMovingFurnishing(false);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[aria-label="Переместить выбранный предмет"]')?.focus({ preventScroll: true }));
  };
  const arrangeFurnishings = () => {
    if (!room || pendingDraft) return;
    setArrangement(true); setView("plan"); setFurnished(true); setTab("interior"); setSelectedPieceId(undefined);
    setSelectedFurnishing(activeFurnishing ?? layoutFurnishings(room).placements[0]?.id ?? interiorFor(room).items[0]?.id);
    const mobile = window.matchMedia("(max-width: 980px)").matches;
    setPanel(mobile ? null : "properties");
    requestAnimationFrame(() => {
      if (!mobile) scrollPropertiesTo(document.querySelector<HTMLElement>('[aria-label="Положение предметов"]'));
      document.querySelector<HTMLDivElement>('[aria-label="Редактор расстановки предметов"]')?.focus({ preventScroll: true });
    });
  };
  const showFurnishingIssues = () => {
    showFurnishingProperties();
    requestAnimationFrame(() => {
      const notice = document.querySelector<HTMLElement>('[aria-label="Положение предметов"] [role="status"]');
      scrollPropertiesTo(notice); notice?.focus({ preventScroll: true });
    });
  };
  const setFurnishingPosition = (id: string, position: FurnishingPosition) => updateRoom((current) => { current.interior = interiorWithPosition(current, id, position); });
  const rotateFurnishing = (id: string) => {
    if (!room || pendingDraft || placementGesture) return;
    const placed = layoutFurnishings(room).placements.find((item) => item.id === id);
    if (placed) setFurnishingPosition(id, rotatedFurnishingPosition(room, placed));
  };
  const resetFurnishingPosition = (id: string) => updateRoom((current) => {
    const interior = interiorFor(current);
    current.interior = { ...interior, items: interior.items.map((item) => { const next = { ...item }; if (item.id === id) delete next.position; return next; }) };
  });
  const resetAllFurnishingPositions = () => updateRoom((current) => {
    const interior = interiorFor(current);
    current.interior = { ...interior, items: interior.items.map((item) => { const next = { ...item }; delete next.position; return next; }) };
  });
  const setFurnishingDimensions = (id: string, dimensions?: FurnishingDimensions) => updateRoom((current) => { current.interior = interiorWithDimensions(current, id, dimensions); });
  const duplicateFurnishing = (id: string) => {
    const source = room && interiorFor(room).items.find((item) => item.id === id); if (!source) return;
    const copyId = newId("item");
    updateRoom((current) => { current.interior = interiorWithAddedItem(current, { id: copyId, kind: source.kind, ...(source.dimensions ? { dimensions: { ...source.dimensions } } : {}) }); });
    setSelectedFurnishing(copyId);
  };
  const removeFurnishing = (id: string) => {
    const remaining = room && interiorFor(room).items.find((item) => item.id !== id);
    updateRoom((current) => { current.interior = interiorWithoutItem(current, id); }); setSelectedFurnishing(remaining?.id);
  };
  const chooseRoom = (id: string, nextTab: Tab = tab) => { setSelectedRoomId(id); setTab(nextTab); setSelectedPieceId(undefined); setSelectedTile(undefined); setPanel("properties"); };

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement;
      if (element.matches("input, textarea, select") || element.isContentEditable || modal) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); setHistory((current) => current ? (event.shiftKey ? redoWorkspace(current) : undoWorkspace(current)) : current); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); setHistory((current) => current ? redoWorkspace(current) : current); }
      if (event.key === "Escape") { setExportMenu(false); setPanel(null); setSelectedPieceId(undefined); setSelectedTile(undefined); }
    };
    window.addEventListener("keydown", keydown); return () => window.removeEventListener("keydown", keydown);
  }, [modal]);

  const addRoom = (added: ConstructorRoom): string | undefined => {
    if (pendingDraft || !workspace || workspace.project.rooms.length >= 100) return "Завершите ввод в проекте и проверьте, что в нём меньше 100 помещений.";
    const issues = validateProject({ ...workspace.project, rooms: [...workspace.project.rooms, added] });
    if (issues.length) return `Не удалось добавить помещение: ${issues[0]}`;
    commit((current) => current.project.rooms.push(added)); chooseRoom(added.id, "room"); setModal(null); setView("3d"); setFurnished(true);
  };
  const duplicateRoom = () => {
    if (!room) return; const copied = cloneValue(room); copied.id = newId("room"); copied.name = `${room.name.slice(0, 110)} — копия`;
    copied.openings = copied.openings.map((opening) => ({ ...opening, id: newId("opening") }));
    commit((current) => current.project.rooms.push(copied)); chooseRoom(copied.id, "room");
  };
  const addOpening = (type: Opening["type"]) => {
    if (!room) return;
    for (let wall = 0; wall < 4; wall++) {
      const length = wall % 2 === 0 ? room.widthMm : room.lengthMm;
      const width = Math.min(type === "door" ? 900 : 1400, length * .6);
      const occupied = room.openings.filter((opening) => opening.wall === wall).sort((a, b) => a.offsetMm - b.offsetMm);
      const candidates = [Math.max(0, (length - width) / 2), 0, ...occupied.map((opening) => opening.offsetMm + opening.widthMm)];
      const offset = candidates.find((candidate) => candidate + width <= length && occupied.every((opening) => candidate >= opening.offsetMm + opening.widthMm || candidate + width <= opening.offsetMm));
      if (offset === undefined) continue;
      const sill = type === "door" ? 0 : Math.min(900, room.heightMm * .3);
      const added: Opening = { id: newId("opening"), type, wall: wall as Opening["wall"], offsetMm: Math.round(offset), widthMm: Math.round(width), heightMm: Math.min(type === "door" ? 2100 : 1400, room.heightMm - sill), sillMm: sill };
      updateRoom((current) => current.openings.push(added)); return;
    }
    setNotice("На стенах нет свободного места для нового проёма. Измените положение или ширину существующих проёмов.");
  };

  const performExport = async (kind: "png" | "pdf" | "xlsx" | "project") => {
    if (!workspace || pendingDraft || placementGesture || busyExport || (kind !== "project" && !result)) return;
    if (kind === "png" && (!room || !roomResult)) return;
    setExportMenu(false); setBusyExport(kind === "project" ? "файл проекта" : kind.toUpperCase());
    try {
      const exports = await import("@/lib/constructor/export");
      if (kind === "project") exports.exportProjectFile(workspace);
      if (kind === "pdf") await exports.exportConstructorPdf(workspace);
      if (kind === "xlsx") await exports.exportConstructorXlsx(workspace);
      if (kind === "png" && room && roomResult) await exports.exportRoomPng(room, roomResult, view === "3d" ? capture.current?.() : undefined, (view === "3d" || view === "plan") && furnished, view === "elevation" ? selectedWall : undefined);
      journey.current.export(kind);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Не удалось создать файл. Повторите экспорт."); }
    finally { setBusyExport(""); }
  };

  const openProjects = async () => {
    if (!workspace || pendingDraft || validation.length) return;
    try { await savingQueue.current.catch(() => {}); await saveWorkspace(workspace); setProjects(await listWorkspaces()); setModal("projects"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Не удалось открыть проекты."); }
  };
  const loadProject = async (id: string) => {
    try { const loaded = await loadWorkspace(id); if (loaded) { journey.current.open(loaded.project, "resume"); setGuideVisible(false); setHistory({ present: loaded, past: [], future: [] }); setSelectedRoomId(loaded.project.rooms[0]?.id ?? ""); setModal(null); setSelectedPieceId(undefined); } }
    catch (error) { setNotice(error instanceof Error ? error.message : "Проект не загрузился."); }
  };
  const createProject = () => {
    const next = createWorkspace(); setHistory({ present: next, past: [], future: [] }); setSelectedRoomId(next.project.rooms[0]?.id ?? ""); setModal(null); setSelectedPieceId(undefined); setTab("room");
    journey.current.open(next.project, "new"); setGuideVisible(guideAllowed());
  };

  if (!workspace || !history) return <div className={styles.loading}><span className={styles.brandMark}>М</span><h1>Конструктор Мастерок</h1><p>Открываем ваш проект…</p></div>;

  const tree = <>
    <div className={styles.treeHeading}><strong>Мой проект</strong><IconButton label="Открыть сохранённые проекты" onClick={openProjects}><FolderOpen size={18} /></IconButton></div>
    <div className={styles.projectCaption}><Home size={18} /><span>{workspace.project.name}</span></div>
    <div className={styles.roomTree}>
      {workspace.project.rooms.map((item) => <div key={item.id}>
        <button type="button" aria-label={item.name} className={`${styles.roomButton} ${room?.id === item.id ? styles.selectedRoom : ""}`} onClick={() => chooseRoom(item.id, "room")}><ChevronDown size={15} /><RoomTypeIcon type={interiorFor(item).type} /><span className={styles.roomCardText}><strong>{item.name}</strong><small>{formatNumber(item.widthMm)} × {formatNumber(item.lengthMm)} мм</small></span></button>
        {room?.id === item.id && <div className={styles.surfaceTree}>
          <button type="button" className={tab === "floor" ? styles.active : ""} onClick={() => { setTab("floor"); setPanel("properties"); }}><Layers size={17} />Пол · {item.floor.kind === "tile" ? "плитка" : "ламинат"}</button>
          <button type="button" className={tab === "walls" ? styles.active : ""} onClick={() => { setTab("walls"); setPanel("properties"); }}><Grid2X2 size={17} />Стены · плитка</button>
          <button type="button" className={tab === "room" ? styles.active : ""} onClick={showRoomProperties}><Ruler size={17} />Размеры и проёмы</button>
          <button type="button" className={tab === "interior" ? styles.active : ""} onClick={showInterior}><RoomTypeIcon type={interiorFor(item).type} />Обстановка</button>
        </div>}
      </div>)}
    </div>
    <button type="button" className={styles.addRoom} disabled={!!pendingDraft || workspace.project.rooms.length >= 100} onClick={() => setModal("add-room")}><Plus size={18} />Добавить помещение</button>
    <div className={styles.treeBottom}><button type="button" onClick={() => setModal("variants")}><Layers size={18} />Сравнить варианты <span>{workspace.variants.length}</span></button><p>Проект хранится в этом браузере. Файл проекта — ваша резервная копия.</p><button type="button" onClick={() => void performExport("project")} disabled={!!pendingDraft || !!busyExport || !!validation.length}><Download size={16} />Скачать файл проекта</button></div>
  </>;

  const numericFloor = (field: keyof FloorSpec, label: string, min: number, max: number, unit: string, integer = false) => <NumberField label={label} value={room!.floor[field] as number} min={min} max={max} unit={unit} integer={integer} onCommit={(value) => updateFloor(field, value)} onStatus={onStatus} />;
  const selectedPiece = roomResult?.pieces.find((piece) => piece.id === selectedPieceId);
  const selectedSourceNumber = selectedPiece ? roomResult!.sourceBoards.findIndex((source) => source.id === selectedPiece.sourceBoardId) + 1 : 0;
  const isTileFloor = room?.floor.kind === "tile";
  const isMaterialTab = tab === "floor" || tab === "walls";
  const selectedFloorTile = roomResult?.floorTiles?.cells.find((cell) => cell.id === selectedPieceId);
  const floorLine = result?.purchases.find((line) => isTileFloor ? line.floorRoomIds?.includes(room?.id ?? "") : line.kind === "laminate" && line.roomIds.includes(room?.id ?? ""));
  const tileLine = result?.purchases.find((line) => line.kind === "wall-tile" && line.surfaces?.some((surface) => surface.roomId === room?.id && surface.wall === selectedWall));
  const showWallMetrics = tab === "walls" || view === "elevation";
  const previewLine = showWallMetrics ? tileLine : floorLine;
  const totalArea = result?.rooms.reduce((sum, item) => sum + item.areaM2, 0) ?? 0;
  const missingPrices = result?.purchases.filter((line) => line.unitPriceRub === 0).length ?? 0;
  const estimatedPrices = result?.purchases.some((line) => line.unitPriceRub > 0 && line.priceNote) ?? false;
  const hasPrices = result?.purchases.some((line) => line.unitPriceRub > 0) ?? false;
  const purchaseCost = result ? purchaseCostText(summarizeFinish(workspace.project, result).cost) : null;
  const missingSupplyRates = workspace.project.rooms.reduce((count, room, index) => count + (result && tileSupplyArea(result.rooms[index]) > 0 ? [room.tileSupplies?.adhesive, room.tileSupplies?.grout].filter((spec) => spec?.consumptionKgM2 === 0).length : 0), 0);
  const formatIndex = room ? BOARD_FORMATS.findIndex((format) => format.w === room.floor.boardLengthMm && format.h === room.floor.boardWidthMm) : -1;
  const saveText = placementGesture ? "Перемещаем предмет…" : pendingDraft ? "Ввод не применён" : isSaved ? "Сохранено в браузере" : saved === "invalid" ? "Исправьте параметры" : saved === "error" ? "Не сохранено" : "Сохраняем…";

  return <section className={`${styles.workspace} ${guideVisible ? styles.withGuide : ""}`} aria-label="Конструктор Мастерок">
    <header className={styles.header}>
      <Link href="/konstruktor/" className={styles.brand} title="На стартовую страницу конструктора" aria-label="На стартовую страницу конструктора" onClick={async (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || isSaved) return;
        event.preventDefault();
        if (pendingDraft || validation.length || placementGesture) { setNotice("Завершите изменение параметров, чтобы сохранить проект перед выходом."); return; }
        try { await savingQueue.current.catch(() => {}); await saveWorkspace(workspace); router.push("/konstruktor/"); }
        catch (error) { setNotice(error instanceof Error ? error.message : "Не удалось сохранить проект. Скачайте файл через меню «Экспорт»."); }
      }}><span className={styles.brandMark}>М</span><span>Мастерок</span></Link>
      <h1 className={styles.editorTitle}>Конструктор</h1>
      <div className={styles.projectName}><TextField label="Название проекта" value={workspace.project.name} compact onStatus={onStatus} onCommit={(name) => commit((current) => { current.project.name = name; })} /></div>
      <div className={styles.saved} role="status" aria-label={saveText} title={saveText} aria-live="polite">{isSaved ? <Check size={16} /> : <span className={styles.saveDot} />}<span>{saveText}</span></div>
      <div className={styles.historyButtons}><IconButton label="Отменить действие" disabled={!history.past.length || !!pendingDraft || placementGesture} onClick={() => setHistory((current) => current ? undoWorkspace(current) : current)}><Undo2 size={18} /></IconButton><IconButton label="Повторить действие" disabled={!history.future.length || !!pendingDraft || placementGesture} onClick={() => setHistory((current) => current ? redoWorkspace(current) : current)}><Redo2 size={18} /></IconButton></div>
      <div className={styles.themeButton}><ThemeToggle /></div>
      <div className={styles.exportContainer}>
        <button className={styles.primaryButton} type="button" aria-label={busyExport ? `Готовим ${busyExport}…` : "Экспорт"} onClick={() => setExportMenu((current) => !current)} aria-expanded={exportMenu} disabled={!!busyExport || placementGesture}><Download size={17} /><span>{busyExport ? `Готовим ${busyExport}…` : "Экспорт"}</span><ChevronDown size={15} /></button>
        {exportMenu && <><button className={styles.menuDismiss} aria-label="Закрыть меню экспорта" onClick={() => setExportMenu(false)} /><div className={styles.exportMenu}>
          <button type="button" disabled={!canExport} onClick={() => void performExport("png")}>PNG · {view === "3d" ? "текущий ракурс" : view === "elevation" ? `стена ${selectedWall + 1}` : "план комнаты"}</button>
          <button type="button" disabled={!canExport} onClick={() => void performExport("pdf")}>PDF · схема, ведомость и карты реза</button>
          <button type="button" disabled={!canExport} onClick={() => void performExport("xlsx")}>XLSX · закупка и исходные данные</button>
          <button type="button" disabled={!!pendingDraft || !!validation.length} onClick={() => void performExport("project")}>Файл проекта · резервная копия</button>
          <button type="button" onClick={() => { setExportMenu(false); fileInput.current?.click(); }}><FileInput size={16} />Импортировать проект</button>
        </div></>}
      </div>
      <input ref={fileInput} type="file" accept=".json,.masterok.json,application/json" className={styles.hidden} aria-label="Импорт файла проекта" onChange={async (event) => {
        const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
        try {
          const imported = await readWorkspaceFile(file);
          if (workspace && !validation.length) { await savingQueue.current.catch(() => {}); await saveWorkspace(workspace); }
          journey.current.open(imported.project, "import"); setGuideVisible(false);
          setHistory({ present: imported, past: [], future: [] }); setSelectedRoomId(imported.project.rooms[0]?.id ?? ""); setSelectedPieceId(undefined); setNotice("Проект импортирован как отдельная копия.");
        } catch (error) { setNotice(error instanceof Error ? error.message : "Не удалось прочитать файл проекта."); }
      }} />
    </header>

    {guideVisible && <ConstructorQuickStart active={tab === "room" ? "dimensions" : tab === "floor" || tab === "walls" ? "material" : undefined} canOpenResult={!!result && !pendingDraft && !placementGesture}
      onDimensions={() => { trackEvent("constructor_guide_action", { step: "dimensions" }); showRoomProperties(); }}
      onMaterial={() => { trackEvent("constructor_guide_action", { step: "material" }); expandShortPanel(); setTab(room?.wallTiles.some(Boolean) ? "walls" : "floor"); setPanel("properties"); requestAnimationFrame(() => { const properties = document.querySelector<HTMLElement>(`.${styles.properties}`); if (properties) properties.scrollTop = 0; }); }}
      onResult={() => { trackEvent("constructor_guide_action", { step: "result" }); openPurchase(); }}
      onDismiss={() => { trackEvent("constructor_guide_action", { step: "dismiss" }); dismissGuide(); }} />}
    <div className={`${styles.body} ${panel === "properties" ? styles.propertiesOpen : ""} ${panelExpanded ? styles.panelExpanded : ""}`} style={panelHeight === null ? undefined : { "--mobile-panel-height": `min(${panelHeight}px, 76dvh, 700px, calc(100dvh - 230px))` } as CSSProperties}>
      <aside className={styles.tree} aria-label="Дерево проекта">{tree}</aside>
      <div className={styles.center}>
        <div className={styles.viewport} data-view={view}>
          <div className={styles.viewportToolbar}><div className={styles.viewTabs} role="group" aria-label="Представление проекта">
            <button type="button" className={view === "3d" ? styles.active : ""} aria-pressed={view === "3d"} onClick={() => { setView("3d"); setArrangement(false); }}><Box size={16} />3D</button>
            <button type="button" className={view === "plan" ? styles.active : ""} aria-pressed={view === "plan"} onClick={() => setView("plan")}><Grid2X2 size={16} />План</button>
            <button type="button" className={view === "elevation" ? styles.active : ""} aria-pressed={view === "elevation"} onClick={() => { setView("elevation"); setTab("walls"); }}><Square size={16} />Развёртка</button>
            <button type="button" className={view === "cuts" ? styles.active : ""} aria-pressed={view === "cuts"} onClick={() => setView("cuts")}><Scissors size={16} />Раскрой</button>
          </div>{view === "3d" && <div className={styles.cameraTools} role="group" aria-label="Управление камерой"><IconButton label="Приблизить" disabled={!sceneActions} onClick={() => sceneActions?.zoomIn()}><ZoomIn size={18} /></IconButton><IconButton label="Отдалить" disabled={!sceneActions} onClick={() => sceneActions?.zoomOut()}><ZoomOut size={18} /></IconButton><IconButton label="Вид сверху" disabled={!sceneActions} onClick={() => sceneActions?.topView()}><Scan size={17} /></IconButton><IconButton label="Вернуть исходный ракурс" disabled={!sceneActions} onClick={() => { setResetToken((token) => token + 1); setSelectedPieceId(undefined); }}><Maximize2 size={17} /></IconButton></div>}</div>
          {room && roomResult ? <>
            {view === "3d" && <RoomScene room={room} calculation={roomResult} allWalls={allWalls} furnished={furnished} resetToken={resetToken} selectedSurface={tab === "floor" ? "floor" : tab === "walls" ? selectedWall : null} selectedFurnishing={sceneFurnishing?.id} movingFurnishing={movingFurnishingId} onPosition={setFurnishingPosition} onGesture={setPlacementGesture} onExitMove={finishMovingFurnishing} onCapture={captureReady} onControls={sceneControlsReady} onSelect={(surface, kind) => { if (surface === "interior") { if (pendingDraft) return; setSelectedFurnishing(kind); setTab("interior"); setPanel(null); return; } setTab(surface === "floor" ? "floor" : "walls"); if (surface !== "floor") setSelectedWall(surface as Wall); setPanel("properties"); }} onFallback={() => setView("plan")} />}
            {view === "3d" && sceneFurnishing ? <SceneFurnishingControls {...sceneFurnishing} moving={!!movingFurnishingId} blocked={!!pendingDraft || placementGesture} onMove={() => { setPanel(null); setMovingFurnishing(true); }} onExitMove={finishMovingFurnishing} onConfigure={showFurnishingProperties} onInspect={showFurnishingIssues} onRotate={() => rotateFurnishing(sceneFurnishing.id)} onDuplicate={() => duplicateFurnishing(sceneFurnishing.id)} onRemove={() => {
              removeFurnishing(sceneFurnishing.id); setSelectedFurnishing(undefined);
              requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[aria-label="Отменить действие"]')?.focus({ preventScroll: true }));
            }} /> : view !== "cuts" && view !== "elevation" && <button type="button" className={styles.sceneDimensions} aria-label="Изменить размеры комнаты" onClick={showRoomProperties}><Ruler size={15} /><span><strong>{room.name}</strong><span>{formatNumber(room.widthMm)} × {formatNumber(room.lengthMm)} мм</span></span><Pencil size={13} /></button>}
            {view === "plan" && <PlanView room={room} calculation={roomResult} numbers={numbers} furnished={furnished} selectedPieceId={selectedPieceId} onSelect={setSelectedPieceId} editing={arranging} blocked={!!pendingDraft} selectedId={activeFurnishing} onSelectFurnishing={setSelectedFurnishing} onPosition={setFurnishingPosition} onConfigure={showFurnishingProperties} onGesture={setPlacementGesture} />}
            {view === "elevation" && <WallElevation key={room.id + layoutResetToken} room={room} calculation={roomResult} wall={selectedWall} onSelectWall={(wall) => { setSelectedTile(undefined); setSelectedWall(wall); }} selectedTileId={activeTileSelection?.tileId} focusToken={activeTileSelection?.focusToken ?? 0} focusBounds={activeTileSelection?.bounds} onSelectTile={(tileId) => setSelectedTile(tileId ? { roomId: room.id, wall: selectedWall, tileId, calculation: roomResult, focusToken: 0 } : undefined)} onReviewCuts={() => setModal("wall-cuts")} canReviewCuts={!pendingDraft} onConfigure={() => setModal("wall-layout")} />}
            {view === "cuts" && <CutView room={room} calculation={roomResult} onSelect={(id) => { setSelectedPieceId(id); setView("plan"); }} />}
            {view !== "cuts" && view !== "elevation" && !movingFurnishingId && <div className={styles.sceneOptions}><div className={styles.sceneToggles}>{view === "3d" ? <label><input type="checkbox" checked={allWalls} onChange={(event) => setAllWalls(event.target.checked)} />Все стены</label> : !arranging && <label><input type="checkbox" checked={numbers} onChange={(event) => setNumbers(event.target.checked)} />Номера исходных {isTileFloor ? "плиток" : "досок"}</label>}<label title="Условные предметы для масштаба. Не входят в ведомость проекта."><input type="checkbox" aria-label="Пример обстановки" checked={furnished} onChange={(event) => { setFurnished(event.target.checked); if (!event.target.checked) setArrangement(false); }} />Обстановка</label><IconButton label="Настроить обстановку" onClick={showInterior}><Pencil size={16} /></IconButton><button type="button" className={styles.arrangementToggle} aria-pressed={arranging} disabled={!!pendingDraft || !interiorFor(room).items.length} onClick={() => arranging ? setArrangement(false) : arrangeFurnishings()}><Move size={15} />Расстановка</button></div><span>{arranging ? "Перетаскивайте предметы · R — поворот · Esc — отмена переноса" : view === "3d" ? "Перетаскивайте для вращения" : "Нажмите на деталь, чтобы проверить раскрой"}</span></div>}
            {selectedPiece && view === "plan" && <div className={styles.pieceInfo}><div><strong>Деталь {roomResult.pieces.indexOf(selectedPiece) + 1} · доска {selectedSourceNumber}</strong><span>{formatNumber(selectedPiece.sourceLengthMm)} × {formatNumber(selectedPiece.sourceWidthMm)} мм · ряд {selectedPiece.row + 1}</span></div><IconButton label="Убрать выделение детали" onClick={() => setSelectedPieceId(undefined)}><X size={16} /></IconButton></div>}
            {selectedFloorTile && view === "plan" && <div className={styles.pieceInfo}><div><strong>Плитка пола {roomResult.floorTiles!.cells.indexOf(selectedFloorTile) + 1} · {selectedFloorTile.isCut ? "с подрезкой" : "целая"}</strong><span>{selectedFloorTile.fragments.map((p) => `${formatNumber(p.widthMm)} × ${formatNumber(p.heightMm)} мм`).join("; ")}</span></div><IconButton label="Убрать выделение детали" onClick={() => setSelectedPieceId(undefined)}><X size={16} /></IconButton></div>}
          </> : <div className={styles.emptyScene}><Ruler size={36} /><h2>{room ? "Проверьте размеры и параметры" : "Добавьте первое помещение"}</h2><p>{computation.error || "Задайте комнату, чтобы выбрать покрытие и получить список покупок."}</p>{!room && <button className={styles.primaryButton} type="button" onClick={() => setModal("add-room")}><Plus size={18} />Добавить помещение</button>}</div>}
        </div>
        <div className={styles.summaryBar}>
          <div><span>{showWallMetrics ? "Плитка на стене" : "Площадь комнаты"}</span><strong>{showWallMetrics ? wallResult ? `${formatNumber(wallResult.coveredAreaM2)} м²` : "—" : roomResult ? `${formatNumber(roomResult.areaM2)} м²` : "—"}</strong></div>
          <div><span>{showWallMetrics ? "Исходных плиток" : isTileFloor ? "Плиток по раскладке" : "Досок по раскрою"}</span><strong>{showWallMetrics ? wallResult?.baseTiles ?? "—" : isTileFloor ? roomResult?.floorTiles?.baseTiles ?? "—" : roomResult?.baseBoards ?? "—"}</strong></div>
          <div className={styles.summaryCuts}><span>{showWallMetrics || isTileFloor ? "Неуложенная часть" : "Остатки и пропил"}</span><strong>{showWallMetrics ? wallResult ? `${formatNumber(wallResult.unlaidAreaM2, 3)} м²` : "—" : roomResult ? `${formatNumber(isTileFloor ? roomResult.floorTiles?.unlaidAreaM2 ?? 0 : roomResult.offcutAreaM2 + roomResult.kerfAreaM2, 3)} м²` : "—"}</strong></div>
          <button type="button" aria-label="Сравнить варианты" onClick={() => setModal("variants")}><Layers size={17} /><span>Сравнить варианты</span></button>
        </div>
      </div>
      <aside className={`${styles.inspector} ${panel === "properties" ? styles.mobileOpen : ""}`} aria-label="Параметры выбранной комнаты">
        <ResizableSheetHandle expanded={panelExpanded} onResize={resizePanel} onToggle={togglePanel} /><div className={styles.inspectorHeader}><h2>{tab === "floor" ? isTileFloor ? "Пол · Плитка" : "Пол · Ламинат" : tab === "walls" ? "Стена " + (selectedWall + 1) + " · Плитка" : tab === "interior" ? activeFurnishing && room ? furnishingName(room, activeFurnishing) : "Обстановка" : "Помещение"}</h2><div className={styles.panelTools}><button type="button" className={styles.mobileClose} aria-label={panelExpanded ? "Свернуть параметры" : "Развернуть параметры"} aria-expanded={panelExpanded} onClick={togglePanel}><Maximize2 size={17} /></button><button type="button" className={styles.mobileClose} aria-label="Закрыть параметры" onClick={() => setPanel(null)}><X size={18} /></button></div></div>
        <div className={styles.inspectorTabs}>
          <button type="button" className={tab === "floor" ? styles.active : ""} aria-pressed={tab === "floor"} onClick={() => setTab("floor")}>Пол</button>
          <button type="button" className={tab === "walls" ? styles.active : ""} aria-pressed={tab === "walls"} onClick={() => setTab("walls")}>Стены</button>
          <button type="button" className={tab === "room" ? styles.active : ""} aria-pressed={tab === "room"} aria-label="Размеры и проёмы" onClick={showRoomProperties}>Размеры</button>
          <button type="button" className={tab === "interior" ? styles.active : ""} aria-pressed={tab === "interior"} aria-label="Обстановка комнаты" onClick={showInterior}>Обстановка</button>
        </div>
        {room && <div className={styles.properties} key={room.id + tab + (tab === "walls" ? selectedWall : "")}>
          {tab === "room" ? <>
            <TextField label="Название помещения" value={room.name} onCommit={(name) => updateRoom((current) => { current.name = name; })} onStatus={onStatus} />
            <div className={styles.fieldRow}><NumberField label="Ширина" value={room.widthMm} min={300} max={30000} unit="мм" onCommit={(value) => setRoomNumber("widthMm", value)} onStatus={onStatus} /><NumberField label="Длина" value={room.lengthMm} min={300} max={30000} unit="мм" onCommit={(value) => setRoomNumber("lengthMm", value)} onStatus={onStatus} /><NumberField label="Высота" value={room.heightMm} min={500} max={6000} unit="мм" onCommit={(value) => setRoomNumber("heightMm", value)} onStatus={onStatus} /></div>
            <p className={styles.hint}>Размеры внутри помещения. Нумерация стен и отступы проёмов идут по часовой стрелке от верхнего левого угла плана.</p>
            <div className={styles.sectionHeading}><h3>Двери и окна</h3></div>
            {room.openings.length === 0 && <p className={styles.hint}>Добавьте проёмы — они появятся на плане и в 3D. Двери исключаются из длины плинтуса.</p>}
            {room.openings.map((opening, index) => <div className={styles.openingCard} key={opening.id}>
              <div className={styles.openingHeading}><strong>{opening.type === "door" ? "Дверь" : "Окно"} {index + 1}</strong><IconButton label={`Удалить проём ${index + 1}`} onClick={() => updateRoom((current) => { current.openings = current.openings.filter((item) => item.id !== opening.id); })}><Trash2 size={16} /></IconButton></div>
              <label className={styles.field}><span>Стена</span><select value={opening.wall} aria-label={`Стена проёма ${index + 1}`} onChange={(event) => updateRoom((current) => { current.openings.find((item) => item.id === opening.id)!.wall = Number(event.target.value) as Opening["wall"]; })}>{[0, 1, 2, 3].map((wall) => <option value={wall} key={wall}>Стена {wall + 1}</option>)}</select></label>
              <NumberField label={`Отступ проёма ${index + 1}`} value={opening.offsetMm} max={30000} unit="мм" onStatus={onStatus} onCommit={(value) => updateRoom((current) => { current.openings.find((item) => item.id === opening.id)!.offsetMm = value; })} />
              <div className={styles.fieldRow}>{(["widthMm", "heightMm"] as const).map((field) => <NumberField key={field} label={`${field === "widthMm" ? "Ширина" : "Высота"} проёма ${index + 1}`} value={opening[field]} min={100} max={30000} unit="мм" onStatus={onStatus} onCommit={(value) => updateRoom((current) => { current.openings.find((item) => item.id === opening.id)![field] = value; })} />)}</div>
              {opening.type === "window" && <NumberField label={`Высота подоконника ${index + 1}`} value={opening.sillMm} max={6000} unit="мм" onStatus={onStatus} onCommit={(value) => updateRoom((current) => { current.openings.find((item) => item.id === opening.id)!.sillMm = value; })} />}
            </div>)}
            <div className={styles.fieldRow}><button className={styles.secondaryButton} type="button" onClick={() => addOpening("door")}><Plus size={16} />Дверь</button><button className={styles.secondaryButton} type="button" onClick={() => addOpening("window")}><Plus size={16} />Окно</button></div>
            <div className={styles.roomActions}><button type="button" onClick={duplicateRoom}><Copy size={16} />Дублировать комнату</button><button type="button" onClick={() => setModal("remove-room")}><Trash2 size={16} />Удалить комнату</button></div>
          </> : tab === "interior" ? <RoomInteriorControls room={room} blocked={!!pendingDraft || placementGesture} onArrange={arrangeFurnishings} onChange={(interior) => updateRoom((current) => { current.interior = interior; })}>
            <FurnishingPlacementControls room={room} selectedId={activeFurnishing} blocked={!!pendingDraft || placementGesture} onSelect={(id) => { setSelectedFurnishing(id); if (id) showFurnishingProperties(); }} onPosition={setFurnishingPosition} onReset={resetFurnishingPosition} onResetAll={resetAllFurnishingPositions} onDimensions={setFurnishingDimensions} onDuplicate={duplicateFurnishing} onRemove={removeFurnishing} onStatus={onStatus} />
          </RoomInteriorControls> : tab === "walls" ? <><WallTileInspector room={room} wall={selectedWall} calculation={wallResult} onSelectWall={(wall) => { setSelectedTile(undefined); setSelectedWall(wall); }} onChange={updateWallTile} onAll={applyTilesToAll} onContinuation={setTileContinuation} onStatus={onStatus} onReviewCuts={() => setModal("wall-cuts")} canReviewCuts={!!roomResult && !pendingDraft} onConfigure={() => setModal("wall-layout")} />{room.wallTiles.some(Boolean) && <TileSupplyControls value={room.tileSupplies} calculation={roomResult} onStatus={onStatus} onChange={(supplies) => updateRoom((current) => { current.tileSupplies = supplies; })} />}</> : <>
            <label className={styles.field}><span>Напольное покрытие</span><select aria-label="Напольное покрытие" value={isTileFloor ? "tile" : "laminate"} disabled={!!pendingDraft} onChange={(event) => {
              const kind = event.target.value as "tile" | "laminate"; setSelectedPieceId(undefined);
              updateRoom((current) => { current.floor.kind = kind; if (kind === "tile" && !current.floor.tile) current.floor.tile = createFloorTileSpec(); });
            }}><option value="laminate">Ламинат</option><option value="tile">Плитка / керамогранит</option></select></label>
            {isTileFloor && room.floor.tile ? <><FloorTileInspector spec={room.floor.tile} calculation={roomResult?.floorTiles} onStatus={onStatus} onChange={(spec) => updateFloor("tile", spec)} /><TileSupplyControls value={room.tileSupplies} calculation={roomResult} onStatus={onStatus} onChange={(supplies) => updateRoom((current) => { current.tileSupplies = supplies; })} /></> : <>
            <div className={styles.sectionHeading}><h3>Оттенок покрытия</h3><span>4 образца</span></div>
            <div className={styles.materials}>{DECORS.map((decor) => <button type="button" key={decor.id} aria-label={decor.name} className={room.floor.decor === decor.id ? styles.selectedMaterial : ""} aria-pressed={room.floor.decor === decor.id} onClick={() => updateFloor("decor", decor.id)}><MaterialSwatch decor={decor.id} />{room.floor.decor === decor.id && <span className={styles.materialCheck}><Check size={12} /></span>}<span>{decor.name}</span></button>)}</div>
            <label className={styles.field}><span>Формат доски</span><select aria-label="Формат доски" value={customFormat || formatIndex < 0 ? "custom" : String(formatIndex)} onChange={(event) => { if (event.target.value === "custom") { setCustomFormat(true); return; } const format = BOARD_FORMATS[Number(event.target.value)]; setCustomFormat(false); updateRoom((current) => { current.floor.boardLengthMm = format.w; current.floor.boardWidthMm = format.h; }); }}>{BOARD_FORMATS.map((format, index) => <option key={format.label} value={index}>{format.w} × {format.h} мм</option>)}<option value="custom">Свой размер…</option></select></label>
            {(customFormat || formatIndex < 0) && <div className={styles.fieldRow}>{numericFloor("boardLengthMm", "Длина доски", 100, 3000, "мм")}{numericFloor("boardWidthMm", "Ширина доски", 40, 600, "мм")}</div>}
            <div className={styles.propertySection}><h3>Рисунок укладки</h3><div className={styles.patternOptions}>{(["third", "half"] as const).map((pattern) => <button type="button" key={pattern} aria-pressed={room.floor.pattern === pattern} className={room.floor.pattern === pattern ? styles.active : ""} onClick={() => updateFloor("pattern", pattern)}><PatternSketch pattern={pattern} /><span>Палуба {pattern === "third" ? "1/3" : "1/2"}</span></button>)}</div></div>
            <div className={styles.field}><span>Направление доски</span><div className={styles.directionOptions}><button type="button" aria-pressed={room.floor.direction === "width"} className={room.floor.direction === "width" ? styles.active : ""} onClick={() => updateFloor("direction", "width")}><span className={styles.boardsHorizontal} />Вдоль ширины</button><button type="button" aria-pressed={room.floor.direction === "length"} className={room.floor.direction === "length" ? styles.active : ""} onClick={() => updateFloor("direction", "length")}><span className={styles.boardsVertical} />Вдоль длины</button></div></div>
            {numericFloor("reservePercent", "Дополнительный резерв", 0, 100, "%")}
            <InspectorSection title="Упаковка и стоимость" value={`${room.floor.boardsPerPack} шт./уп. · ${room.floor.packPriceRub ? formatMoney(room.floor.packPriceRub) : "цена не задана"}`}><div className={styles.fieldRow}>{numericFloor("boardsPerPack", "Досок в упаковке", 1, 1000, "шт.", true)}{numericFloor("packPriceRub", "Цена упаковки", 0, 10000000, "₽")}</div><p className={styles.hint}>Фасовка и цена — по вашему товару. Образцы цвета служат для визуализации.</p></InspectorSection>
            <details className={styles.details}><summary>Монтаж и параметры товара</summary><div className={styles.detailsContent}>
              <TextField label="Товар или артикул" value={room.floor.materialKey} onCommit={(value) => updateFloor("materialKey", value)} onStatus={onStatus} />
              <div className={styles.fieldRow}>{numericFloor("expansionGapMm", "Зазор у стен", 0, 100, "мм")}{numericFloor("kerfMm", "Ширина пропила", 0, 20, "мм")}</div>
              <label className={styles.checkbox}><input type="checkbox" checked={room.floor.reuseOffcuts} onChange={(event) => updateFloor("reuseOffcuts", event.target.checked)} /><span>Совмещать пригодные торцевые детали</span></label>
              <p className={styles.hint}>Зазор, допустимое смещение и размеры крайних деталей проверьте по инструкции покрытия. Продольные полосы и средние обрезки повторно не используются.</p>
            </div></details>
            <details className={styles.details}><summary>Подложка и плинтус</summary><div className={styles.detailsContent}>
              <label className={styles.checkbox}><input type="checkbox" checked={room.floor.includeUnderlay} onChange={(event) => updateFloor("includeUnderlay", event.target.checked)} /><span>Добавить подложку</span></label>
              {room.floor.includeUnderlay && <div className={styles.fieldRow}>{numericFloor("underlayRollAreaM2", "Площадь рулона", .1, 1000, "м²")}{numericFloor("underlayRollPriceRub", "Цена рулона", 0, 10000000, "₽")}</div>}
              <label className={styles.checkbox}><input type="checkbox" checked={room.floor.includePlinth} onChange={(event) => updateFloor("includePlinth", event.target.checked)} /><span>Добавить плинтус</span></label>
              {room.floor.includePlinth && <div className={styles.fieldRow}>{numericFloor("plinthLengthMm", "Длина планки", 100, 5000, "мм")}{numericFloor("plinthPiecePriceRub", "Цена планки", 0, 10000000, "₽")}</div>}
              <p className={styles.hint}>По площади покрытия и длине стен без дверей. Раскрой подложки и планок плинтуса нужно проверить отдельно.</p>
            </div></details>
            </>}
          </>}
          {pendingDraft && <p className={styles.formNotice} role="status">{pendingDraft}</p>}
          {computation.error && <p className={styles.fieldError} role="alert">{computation.error}</p>}
        </div>}
        <div className={styles.purchasePreview}><div className={styles.sectionHeading}><h3>Ведомость проекта</h3><span>{result?.purchases.length ?? 0} поз.</span></div>
          <div className={styles.purchaseOverview}><div><strong>{!result ? "Проверьте параметры" : hasPrices ? formatMoney(result.totalCostRub) : "Цены не заданы"}</strong><span>{!result ? "Исправьте ошибки в полях" : (missingPrices || missingSupplyRates) && hasPrices ? "Сумма известных позиций" : estimatedPrices ? "Оценка по введённым ценам" : hasPrices ? "По введённым ценам" : "Укажите цены для оценки стоимости"}</span></div>{previewLine && <span className={styles.packCount}>{previewLine.quantity}<small>{showWallMetrics || isTileFloor ? "упак. плитки" : "упак. ламината"}</small></span>}</div>
          {floorLine && floorLine.roomIds.length > 1 && <p className={styles.hint}>{isTileFloor ? "Плитка" : "Ламинат"} общей партией для {floorLine.roomIds.length} помещений.</p>}
          <button className={styles.primaryButton} type="button" onClick={openPurchase} disabled={!result || !!pendingDraft}><ShoppingCart size={18} />Открыть ведомость</button>
        </div>
      </aside>
      {panel === "tree" && <div className={styles.mobileTree}><div className={styles.panelHandle} /><div className={styles.inspectorHeader}><h2>Мой проект</h2><div className={styles.panelTools}><IconButton label="Открыть сохранённые проекты" onClick={openProjects}><FolderOpen size={18} /></IconButton><ThemeToggle /><IconButton label="Закрыть дерево проекта" onClick={() => setPanel(null)}><X size={18} /></IconButton></div></div>{tree}</div>}
    </div>

    <nav className={styles.mobileNav} aria-label="Разделы конструктора"><button type="button" className={panel === "tree" ? styles.active : ""} onClick={() => setPanel(panel === "tree" ? null : "tree")}><Home size={21} />Проект</button><button type="button" className={panel === "properties" && tab === "room" ? styles.active : ""} onClick={() => { if (panel === "properties" && tab === "room") setPanel(null); else showRoomProperties(); }}><Ruler size={21} />Размеры</button><button type="button" className={panel === "properties" && isMaterialTab ? styles.active : ""} onClick={() => { if (!isMaterialTab) setTab("floor"); setPanel(panel === "properties" && isMaterialTab ? null : "properties"); }}><Layers size={21} />Материал</button><button type="button" disabled={!result || !!pendingDraft || placementGesture} onClick={() => { setPanel(null); openPurchase(); }}><ShoppingCart size={21} />Ведомость</button></nav>

    {notice && <div className={styles.notice} role="alert"><p>{notice}</p><IconButton label="Закрыть сообщение" onClick={() => setNotice("")}><X size={18} /></IconButton></div>}

    {modal === "purchase" && <ModalWindow title="Ведомость проекта" onClose={() => setModal(null)}>
      <div className={styles.modalBody}><p className={styles.modalLead}>{workspace.project.name} · {workspace.project.rooms.length} помещ. · {formatNumber(totalArea)} м².</p>
        {!result ? <p className={styles.fieldError}>{computation.error}</p> : <>
          <p className={styles.purchaseIntro}>Количество к покупке указано справа. Запас уже включён; одинаковый товар объединён по помещениям перед округлением до упаковок.</p>
          {!!missingSupplyRates && <p className={styles.formNotice} role="status">Смесей без заданного расхода: {missingSupplyRates}. Они пока не включены в ведомость. Укажите кг/м² в разделе «Клей и затирка» или отключите их.</p>}
          <div className={styles.purchaseList}>{result.purchases.map((line) => <article className={styles.purchaseRow} key={line.id}>
            <div><h3>{line.name}</h3><p>{line.detail}</p><small>{line.roomIds.map((id) => workspace.project.rooms.find((item) => item.id === id)?.name).join(", ")}</small></div><div className={styles.purchaseQuantity}><strong>{line.quantity} {line.unit}</strong><span>{line.unitPriceRub ? formatMoney(line.totalPriceRub) : "Цена не задана"}</span>{line.unitPriceRub > 0 && <span>{formatMoney(line.unitPriceRub)} / {line.unit}</span>}</div>
            <dl className={styles.purchaseFacts}>{purchaseFacts(line).map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
            <details className={styles.purchaseDetails}>
              <summary aria-label={`Расчёт и запас: ${line.name}`}><ChevronDown size={16} aria-hidden="true" />Расчёт и запас</summary>
              <div className={styles.purchaseDetailsBody}>
                <p className={styles.purchaseExplanation}>{line.basis}</p>
                {line.purchasedBoards !== undefined && <p className={styles.purchaseExplanation}>В упаковках: {line.purchasedBoards} досок ({formatNumber(line.purchasedAreaM2!)} м²). Из них {line.packSurplusBoards} досок — остаток от округления до упаковок.</p>}
                {line.purchasedTiles !== undefined && <p className={styles.purchaseExplanation}>В упаковках: {line.purchasedTiles} плиток ({formatNumber(line.purchasedAreaM2!)} м²). Из них {line.packSurplusTiles} шт. — остаток от округления до упаковок. Поверхности: {[...(line.floorRoomIds?.map((id) => `${workspace.project.rooms.find((item) => item.id === id)?.name}, пол`) ?? []), ...(line.surfaces?.map((surface) => `${workspace.project.rooms.find((item) => item.id === surface.roomId)?.name}, стена ${surface.wall + 1}`) ?? [])].join("; ")}.</p>}
              </div>
            </details>
          </article>)}</div>
          <div className={styles.purchaseTotal}><span>{purchaseCost?.label}</span><strong>{purchaseCost?.value}</strong></div>
          {estimatedPrices && <p className={styles.hint}>Для одинакового товара с разными ценами взята максимальная введённая цена. Уточните цену общей закупки перед заказом.</p>}
          {!!missingPrices && <p className={styles.hint}>{hasPrices ? `Позиций без цены: ${missingPrices}. Общая стоимость проекта пока неполная.` : "Количество к покупке рассчитано. Для стоимости укажите цены выбранных товаров в параметрах покрытий и смесей."}</p>}
          <details className={styles.details}><summary>Как получен результат</summary><div className={styles.detailsContent}><p>Одинаковый товар объединён перед округлением до упаковок.</p>{result.rooms.map((r) => <div key={r.roomId}>
            <h3>{workspace.project.rooms.find((item) => item.id === r.roomId)?.name}</h3>
            {r.floorTiles ? <p>Пол: {formatNumber(r.areaM2)} м² помещения → {formatNumber(r.floorTiles.netAreaM2, 3)} м² укладки со швами → {r.floorTiles.baseTiles} исходных плиток, из них {r.floorTiles.cutTiles} с подрезкой. Неуложенная часть {formatNumber(r.floorTiles.unlaidAreaM2, 3)} м².</p> : <p>Пол: {formatNumber(r.areaM2)} м² помещения → {formatNumber(r.coveredAreaM2)} м² покрытия → {r.pieces.length} деталей → {r.baseBoards} исходных досок. Остатки {formatNumber(r.offcutAreaM2, 3)} м²; потеря материала на пропиле {formatNumber(r.kerfAreaM2, 4)} м².</p>}
            {r.warnings.map((warning) => <p className={styles.hint} key={warning}>{warning}</p>)}
            {r.walls.map((wall) => <div key={wall.wall}><p>Стена {wall.wall + 1}: {formatNumber(wall.netAreaM2)} м² без проёмов → {formatNumber(wall.coveredAreaM2, 3)} м² плитки без швов → {wall.baseTiles} исходных плиток, в том числе {wall.cutTiles} с подрезкой. Неуложенный материал: {formatNumber(wall.unlaidAreaM2, 3)} м².</p>{wall.warnings.map((warning) => <p className={styles.hint} key={warning}>{warning}</p>)}</div>)}
          </div>)}</div></details>
          <div className={styles.modalActions}><button className={styles.primaryButton} type="button" disabled={!canExport} onClick={() => void performExport("pdf")}><Download size={17} />Скачать PDF</button><button className={styles.secondaryButton} type="button" disabled={!canExport} onClick={() => void performExport("xlsx")}>Скачать XLSX</button></div>
          <div className={styles.projectBackup}>
            <h3>Продолжить на другом устройстве</h3>
            <p>Проект автоматически сохраняется в этом браузере. Скачайте файл .masterok.json для переноса размеров, материалов и вариантов. На другом устройстве откройте его на <Link href="/konstruktor/">странице конструктора</Link> кнопкой «Открыть файл проекта».</p>
            <button className={styles.secondaryButton} type="button" disabled={!canExport} onClick={() => void performExport("project")}><Download size={17} aria-hidden="true" />Скачать файл проекта</button>
          </div>
          {busyExport && <p role="status">Готовим {busyExport}…</p>}
        </>}
      </div>
    </ModalWindow>}

    {modal === "variants" && <ModalWindow title="Сравнение вариантов" wide={workspace.variants.length > 0} onClose={() => setModal(null)}>
      <VariantComparison project={workspace.project} calculation={result} variants={workspace.variants} selectedRoomId={selectedRoomId} blocked={!!pendingDraft}
        initialSelection={comparisonSelection.current[workspace.project.id]}
        onSelectionChange={(ids) => { comparisonSelection.current[workspace.project.id] = ids; }}
        onContinue={() => setModal(null)}
        onSave={(name) => {
          const id = newId("variant");
          commit((current) => current.variants.push({ id, name, rooms: cloneValue(current.project.rooms), savedAt: new Date().toISOString() }));
          return id;
        }}
        onRename={(id, name) => commit((current) => { const variant = current.variants.find((item) => item.id === id); if (variant) variant.name = name; })}
        onRemove={(id) => commit((current) => { current.variants = current.variants.filter((item) => item.id !== id); })}
        onApply={(variant) => {
          commit((current) => { current.project.rooms = cloneValue(variant.rooms); });
          setSelectedRoomId(variant.rooms.some((item) => item.id === selectedRoomId) ? selectedRoomId : variant.rooms[0]?.id ?? "");
          setSelectedPieceId(undefined); setModal(null);
          setNotice(`Применён вариант «${variant.name}». Кнопка «Отменить действие» вернёт предыдущую раскладку.`);
        }} />
    </ModalWindow>}

    {modal === "add-room" && <ModalWindow title="Добавить помещение" aboveNotice onClose={() => setModal(null)}><RoomCreationForm existingNames={workspace.project.rooms.map((item) => item.name)} blocked={!!pendingDraft || workspace.project.rooms.length >= 100} onCreate={addRoom} onCancel={() => setModal(null)} /></ModalWindow>}
    {modal === "projects" && <ModalWindow title="Проекты в этом браузере" onClose={() => setModal(null)}><div className={styles.modalBody}><div className={styles.modalActions}><button className={styles.primaryButton} type="button" onClick={createProject}><Plus size={17} />Новый проект</button><button className={styles.secondaryButton} type="button" onClick={() => { setModal(null); fileInput.current?.click(); }}>Импорт файла</button></div><div className={styles.projectList}>{projects.map((project) => <button type="button" key={project.id} onClick={() => void loadProject(project.id)}><FolderOpen size={23} /><span><strong>{project.name}</strong><small>{project.rooms} помещ. · {new Date(project.updatedAt).toLocaleDateString("ru-RU")}</small></span>{project.id === workspace.project.id && <Check size={18} />}</button>)}</div></div></ModalWindow>}

    {modal === "remove-room" && <ModalWindow title="Удалить помещение?" onClose={() => setModal(null)}><div className={styles.modalBody}><p>Помещение «{room?.name}» и его покрытие будут удалены из текущего проекта. Действие можно отменить.</p><div className={styles.modalActions}><button className={styles.primaryButton} type="button" onClick={() => { commit((current) => { current.project.rooms = current.project.rooms.filter((item) => item.id !== room?.id); }); setSelectedRoomId(workspace.project.rooms.find((item) => item.id !== room?.id)?.id ?? ""); setSelectedPieceId(undefined); setModal(null); }}>Удалить помещение</button><button className={styles.secondaryButton} type="button" onClick={() => setModal(null)}>Оставить</button></div></div></ModalWindow>}
    {modal === "wall-cuts" && room && roomResult && <ModalWindow title="Подрезки плитки" onClose={() => setModal(null)}><WallCutReview room={room} entries={wallCutEntries} assignedWalls={roomResult.walls.map((wall) => wall.wall)} onShowTile={showTileCut} /></ModalWindow>}
    {modal === "wall-layout" && room && result && room.wallTiles[selectedWall] && <ModalWindow title="Настройка раскладки" wide onClose={() => setModal(null)}><WallLayoutPreview project={workspace.project} calculation={result} roomId={room.id} wall={selectedWall} variants={workspace.variants} onApply={applyLayoutPreview} onClose={() => setModal(null)} /></ModalWindow>}
  </section>;
}

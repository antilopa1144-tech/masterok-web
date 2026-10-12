import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { FURNISHING_MOVEMENT_STEPS, type FurnishingDirection, type FurnishingMovementStep } from "@/lib/constructor/furnishing-movement";
import styles from "./PlanMovementControls.module.css";

const DIRECTIONS = [
  { direction: "left", label: "влево", Icon: ArrowLeft }, { direction: "up", label: "вверх", Icon: ArrowUp },
  { direction: "down", label: "вниз", Icon: ArrowDown }, { direction: "right", label: "вправо", Icon: ArrowRight },
] as const;

export default function PlanMovementControls({ step, blocked, canMove, onStep, onMove }: {
  step: FurnishingMovementStep; blocked: boolean; canMove: (direction: FurnishingDirection) => boolean;
  onStep: (step: FurnishingMovementStep) => void; onMove: (direction: FurnishingDirection) => void;
}) {
  return <div className={styles.controls} role="group" aria-label="Точное перемещение предмета">
    <label><span>Шаг</span><select aria-label="Шаг перемещения предмета" value={step} disabled={blocked} onChange={(event) => onStep(Number(event.target.value) as FurnishingMovementStep)}>{FURNISHING_MOVEMENT_STEPS.map((value) => <option key={value} value={value}>{value} мм</option>)}</select></label>
    <div className={styles.directions}>{DIRECTIONS.map(({ direction, label, Icon }) => <button key={direction} type="button" aria-label={`Сдвинуть предмет ${label} на ${step} мм`} disabled={blocked || !canMove(direction)} onClick={() => onMove(direction)}><Icon size={18} aria-hidden="true" /></button>)}</div>
  </div>;
}

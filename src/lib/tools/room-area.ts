export type RoomShape = "rect" | "lshape" | "tshape" | "trapezoid" | "triangle" | "circle";

export interface RoomAreaInput {
  shape: RoomShape;
  a: number;
  b: number;
  c?: number;
  d?: number;
  e?: number;
  f?: number;
  wallHeight?: number;
}

export interface RoomAreaResult {
  floorArea: number;
  perimeter: number;
  wallArea?: number;
  notes?: string;
}

const NOTES = {
  lshape: "Периметр — приближённый. Уточните по чертежу.",
  tshape: "Площадь трёх секций. Периметр — приближённый.",
  triangle: "Периметр — для равнобедренного треугольника.",
} as const;

function dimension(value: number | undefined): number {
  return Number.isFinite(value) && value! > 0 ? value! : 0;
}

export function parseRoomDimension(value: string): number {
  return dimension(Number.parseFloat(value.replace(",", ".")));
}

export function calculateRoomArea(input: RoomAreaInput): RoomAreaResult {
  const a = dimension(input.a);
  const b = dimension(input.b);
  const c = dimension(input.c);
  const d = dimension(input.d);
  const e = dimension(input.e);
  const f = dimension(input.f);
  const wallHeight = dimension(input.wallHeight);

  let floorArea = 0;
  let perimeter = 0;
  let notes: string | undefined;

  switch (input.shape) {
    case "rect":
      floorArea = a * b;
      perimeter = 2 * (a + b);
      break;
    case "lshape":
      floorArea = Math.max(0, a * b - c * d);
      perimeter = 2 * (a + b);
      notes = NOTES.lshape;
      break;
    case "tshape":
      floorArea = a * b + c * d + e * f;
      perimeter = 2 * (a + b + c + d);
      notes = NOTES.tshape;
      break;
    case "trapezoid": {
      floorArea = ((a + b) / 2) * c;
      const side = Math.sqrt(((a - b) / 2) ** 2 + c ** 2);
      perimeter = a + b + 2 * side;
      break;
    }
    case "triangle": {
      floorArea = 0.5 * a * b;
      const side = Math.sqrt((a / 2) ** 2 + b ** 2);
      perimeter = a + 2 * side;
      notes = NOTES.triangle;
      break;
    }
    case "circle": {
      const fullCircle = b === 0 || b >= 360;
      const angle = fullCircle ? 360 : Math.min(b, 360);
      floorArea = Math.PI * a ** 2 * (angle / 360);
      perimeter = fullCircle
        ? 2 * Math.PI * a
        : 2 * a + 2 * Math.PI * a * (angle / 360);
      break;
    }
  }

  return {
    floorArea,
    perimeter,
    wallArea: wallHeight > 0 ? perimeter * wallHeight : undefined,
    notes,
  };
}

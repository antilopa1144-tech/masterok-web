export type RoomShape = "rect" | "lshape" | "tshape" | "trapezoid" | "triangle" | "circle";

export interface RoomAreaInput {
  shape: RoomShape;
  a: number;
  b: number;
  c?: number;
  d?: number;
  wallHeight?: number;
}

export interface RoomAreaResult {
  floorArea: number;
  perimeter: number;
  wallArea?: number;
  notes?: string;
  error?: string;
}

const NOTES = {
  lshape: "Вырез считается расположенным в углу большого прямоугольника.",
  tshape: "Стойка считается примыкающей к перекладине по центру.",
  trapezoid: "Боковые стороны рассчитаны для равнобедренной трапеции.",
  triangle: "Боковые стороны рассчитаны для равнобедренного треугольника.",
} as const;

function dimension(value: number | undefined): number {
  return Number.isFinite(value) && value! > 0 ? value! : 0;
}

function invalidDimensions(error: string): RoomAreaResult {
  return {
    floorArea: 0,
    perimeter: 0,
    wallArea: undefined,
    notes: undefined,
    error,
  };
}

export function parseRoomDimension(value: string): number {
  return dimension(Number.parseFloat(value.replace(",", ".")));
}

export function calculateRoomArea(input: RoomAreaInput): RoomAreaResult {
  const a = dimension(input.a);
  const b = dimension(input.b);
  const c = dimension(input.c);
  const d = dimension(input.d);
  const wallHeight = dimension(input.wallHeight);

  let floorArea = 0;
  let perimeter = 0;
  let notes: string | undefined;

  switch (input.shape) {
    case "rect":
      if (a === 0 || b === 0) {
        return invalidDimensions("Укажите длину и ширину комнаты больше нуля.");
      }
      floorArea = a * b;
      perimeter = 2 * (a + b);
      break;
    case "lshape":
      if (a === 0 || b === 0 || c === 0 || d === 0) {
        return invalidDimensions("Укажите размеры большого прямоугольника и выреза больше нуля.");
      }
      if (c >= a || d >= b) {
        return invalidDimensions("Ширина и длина выреза должны быть меньше сторон большого прямоугольника.");
      }
      floorArea = a * b - c * d;
      perimeter = 2 * (a + b);
      notes = NOTES.lshape;
      break;
    case "tshape":
      if (a === 0 || b === 0 || c === 0 || d === 0) {
        return invalidDimensions("Укажите размеры перекладины и стойки больше нуля.");
      }
      if (c > a) {
        return invalidDimensions("Ширина стойки не должна превышать длину перекладины.");
      }
      floorArea = a * b + c * d;
      perimeter = 2 * (a + b + d);
      notes = NOTES.tshape;
      break;
    case "trapezoid": {
      if (a === 0 || b === 0 || c === 0) {
        return invalidDimensions("Укажите оба основания и высоту трапеции больше нуля.");
      }
      floorArea = ((a + b) / 2) * c;
      const side = Math.sqrt(((a - b) / 2) ** 2 + c ** 2);
      perimeter = a + b + 2 * side;
      notes = NOTES.trapezoid;
      break;
    }
    case "triangle": {
      if (a === 0 || b === 0) {
        return invalidDimensions("Укажите основание и высоту треугольника больше нуля.");
      }
      floorArea = 0.5 * a * b;
      const side = Math.sqrt((a / 2) ** 2 + b ** 2);
      perimeter = a + 2 * side;
      notes = NOTES.triangle;
      break;
    }
    case "circle": {
      if (a === 0) {
        return invalidDimensions("Укажите радиус больше нуля.");
      }
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

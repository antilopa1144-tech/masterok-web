export const QUICK_CALCULATOR_ERROR = "Ошибка";

const NUMBER_SOURCE = String.raw`(?:\d+(?:\.\d*)?|\.\d+)`;
const TRAILING_NUMBER = new RegExp(`^(.*?)(${NUMBER_SOURCE})$`);
const TRAILING_WRAPPED_NEGATIVE = new RegExp(String.raw`^(.*?)\(-(${NUMBER_SOURCE})\)$`);
const TRAILING_UNWRAPPED_NEGATIVE = new RegExp(`^(.*[+×÷-])-(${NUMBER_SOURCE})$`);

function divideByHundred(rawValue: string): string {
  return String(Number(rawValue) / 100);
}

export function appendQuickCalculatorChar(
  display: string,
  char: string,
  justCalculated: boolean,
): string {
  const numericChar = "0123456789.".includes(char);
  const previous = display === QUICK_CALCULATOR_ERROR ? "0" : display;

  if (justCalculated && display !== QUICK_CALCULATOR_ERROR) {
    if (numericChar) return char === "." ? "0." : char;
    return previous + char;
  }
  if (previous === "0" && numericChar && char !== ".") return char;
  if (char === "." && previous.split(/[+\-×÷]/).pop()?.includes(".")) return previous;
  return previous + char;
}

export function backspaceQuickCalculator(display: string, justCalculated: boolean): string {
  if (display === QUICK_CALCULATOR_ERROR || justCalculated) return "0";
  if (display.length <= 1 || (display.length === 2 && display.startsWith("-"))) return "0";
  return display.slice(0, -1);
}

export function toggleTrailingOperand(display: string): string {
  if (display === "0" || display === QUICK_CALCULATOR_ERROR) return display;

  const wrappedNegative = display.match(TRAILING_WRAPPED_NEGATIVE);
  if (wrappedNegative) return `${wrappedNegative[1]}${wrappedNegative[2]}`;

  if (new RegExp(`^-${NUMBER_SOURCE}$`).test(display)) return display.slice(1);

  const unwrappedNegative = display.match(TRAILING_UNWRAPPED_NEGATIVE);
  if (unwrappedNegative) return `${unwrappedNegative[1]}${unwrappedNegative[2]}`;

  const number = display.match(TRAILING_NUMBER);
  if (!number) return display;
  return number[1] ? `${number[1]}(-${number[2]})` : `-${number[2]}`;
}

export function percentTrailingOperand(display: string): string {
  if (display === QUICK_CALCULATOR_ERROR) return display;

  const wrappedNegative = display.match(TRAILING_WRAPPED_NEGATIVE);
  if (wrappedNegative) {
    return `${wrappedNegative[1]}(-${divideByHundred(wrappedNegative[2])})`;
  }

  const unwrappedNegative = display.match(TRAILING_UNWRAPPED_NEGATIVE);
  if (unwrappedNegative) {
    return `${unwrappedNegative[1]}-${divideByHundred(unwrappedNegative[2])}`;
  }

  if (new RegExp(`^-${NUMBER_SOURCE}$`).test(display)) {
    return `-${divideByHundred(display.slice(1))}`;
  }

  const number = display.match(TRAILING_NUMBER);
  if (!number) return display;
  return `${number[1]}${divideByHundred(number[2])}`;
}

/** Безопасный парсер арифметических выражений без eval/new Function. */
export function evaluateQuickExpression(expression: string): number {
  let pos = 0;
  const source = expression.replace(/\s/g, "");

  function parseExpression(): number {
    let result = parseTerm();
    while (pos < source.length && (source[pos] === "+" || source[pos] === "-")) {
      const operator = source[pos++];
      const term = parseTerm();
      result = operator === "+" ? result + term : result - term;
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();
    while (pos < source.length && (source[pos] === "*" || source[pos] === "/")) {
      const operator = source[pos++];
      const factor = parseFactor();
      result = operator === "*" ? result * factor : result / factor;
    }
    return result;
  }

  function parseFactor(): number {
    if (source[pos] === "-") {
      pos++;
      return -parseFactor();
    }
    if (source[pos] === "(") {
      pos++;
      const result = parseExpression();
      if (source[pos] !== ")") throw new Error("Missing closing parenthesis");
      pos++;
      return result;
    }
    const start = pos;
    while (
      pos < source.length
      && ((source[pos] >= "0" && source[pos] <= "9") || source[pos] === ".")
    ) {
      pos++;
    }
    if (start === pos) throw new Error("Unexpected token");
    return Number.parseFloat(source.slice(start, pos));
  }

  const result = parseExpression();
  if (pos < source.length) throw new Error("Unexpected characters");
  return result;
}

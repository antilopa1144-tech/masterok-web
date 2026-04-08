"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";

type HistoryItem = { expr: string; result: string };

const MAX_HISTORY = 8;

const UI_TEXT = {
  error: "Ошибка",
  breadcrumbHome: "Главная",
  breadcrumbTools: "Инструменты",
  breadcrumbCurrent: "Калькулятор",
  title: "Калькулятор",
  description: "Быстрые вычисления прямо на сайте. Поддерживает клавиатуру.",
  historyTitle: "История вычислений",
  clearHistory: "Очистить",
} as const;


/**
 * Безопасный парсер арифметических выражений (без eval/new Function).
 * Поддерживает: +, -, *, /, скобки, отрицательные числа.
 */
function safeEval(expr: string): number {
  let pos = 0;
  const s = expr.replace(/\s/g, "");

  function parseExpr(): number {
    let result = parseTerm();
    while (pos < s.length && (s[pos] === "+" || s[pos] === "-")) {
      const op = s[pos++];
      const term = parseTerm();
      result = op === "+" ? result + term : result - term;
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();
    while (pos < s.length && (s[pos] === "*" || s[pos] === "/")) {
      const op = s[pos++];
      const factor = parseFactor();
      result = op === "*" ? result * factor : result / factor;
    }
    return result;
  }

  function parseFactor(): number {
    if (s[pos] === "-") {
      pos++;
      return -parseFactor();
    }
    if (s[pos] === "(") {
      pos++; // skip (
      const result = parseExpr();
      pos++; // skip )
      return result;
    }
    const start = pos;
    while (pos < s.length && (s[pos] >= "0" && s[pos] <= "9" || s[pos] === ".")) {
      pos++;
    }
    if (start === pos) throw new Error("Unexpected token");
    return parseFloat(s.slice(start, pos));
  }

  const result = parseExpr();
  if (pos < s.length) throw new Error("Unexpected characters");
  return result;
}

export default function KalkulyatorPage() {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [justCalculated, setJustCalculated] = useState(false);

  const append = useCallback((char: string) => {
    setDisplay((prev) => {
      if (justCalculated) {
        setJustCalculated(false);
        // Если вводим цифру после результата — начинаем заново
        if ("0123456789.".includes(char)) return char;
        // Если вводим оператор — продолжаем от результата
        return prev + char;
      }
      if (prev === "0" && "0123456789".includes(char) && char !== ".") return char;
      if (char === "." && prev.split(/[+\-×÷]/).pop()?.includes(".")) return prev;
      return prev + char;
    });
  }, [justCalculated]);

  const clear = useCallback(() => {
    setDisplay("0");
    setExpression("");
    setJustCalculated(false);
  }, []);

  const backspace = useCallback(() => {
    setDisplay((prev) => {
      if (justCalculated) { setJustCalculated(false); return "0"; }
      if (prev.length <= 1 || (prev.length === 2 && prev.startsWith("-"))) return "0";
      return prev.slice(0, -1);
    });
  }, [justCalculated]);

  const toggleSign = useCallback(() => {
    setDisplay((prev) => {
      if (prev === "0") return "0";
      return prev.startsWith("-") ? prev.slice(1) : "-" + prev;
    });
  }, []);

  const percent = useCallback(() => {
    setDisplay((prev) => {
      const n = parseFloat(prev.replace(",", "."));
      if (isNaN(n)) return prev;
      return String(n / 100);
    });
  }, []);

  const calculate = useCallback(() => {
    const expr = display;
    try {
      const safeExpr = expr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/,/g, ".");

      const result = safeEval(safeExpr);

      if (!isFinite(result) || isNaN(result)) {
        setDisplay(UI_TEXT.error);
        return;
      }

      const resultStr = Number.isInteger(result)
        ? String(result)
        : String(Math.round(result * 1e10) / 1e10);

      setExpression(expr + " =");
      setDisplay(resultStr);
      setJustCalculated(true);

      setHistory((h) => [
        { expr: expr + " = " + resultStr, result: resultStr },
        ...h.slice(0, MAX_HISTORY - 1),
      ]);
    } catch {
      setDisplay(UI_TEXT.error);
    }
  }, [display]);

  // Клавиатура
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") append(e.key);
      else if (e.key === ".") append(".");
      else if (e.key === "+") append("+");
      else if (e.key === "-") append("-");
      else if (e.key === "*") append("×");
      else if (e.key === "/") { e.preventDefault(); append("÷"); }
      else if (e.key === "Enter" || e.key === "=") calculate();
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Escape") clear();
      else if (e.key === "%") percent();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [append, calculate, backspace, clear, percent]);

  const displayText = display.length > 14 ? display.slice(0, 14) + "…" : display;
  const fontSize = display.length > 10 ? "text-3xl" : "text-4xl";

  const BTN = "flex items-center justify-center rounded-2xl font-semibold text-lg h-16 transition-all active:scale-95 select-none cursor-pointer";

  return (
    <div className="page-container py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-400 mb-6">
        <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">{UI_TEXT.breadcrumbHome}</Link>
        <span>/</span>
        <Link href="/instrumenty/" className="hover:text-slate-600 dark:hover:text-slate-300">{UI_TEXT.breadcrumbTools}</Link>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300">{UI_TEXT.breadcrumbCurrent}</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">{UI_TEXT.title}</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">{UI_TEXT.description}</p>

      <div className="max-w-sm mx-auto md:mx-0 md:flex md:gap-8 md:max-w-2xl">
        {/* Калькулятор */}
        <div className="card overflow-hidden w-full max-w-sm">
          {/* Дисплей */}
          <div className="bg-slate-800 px-5 pt-5 pb-4">
            <div className="min-h-5 text-sm text-slate-400 text-right truncate">
              {expression || "\u00a0"}
            </div>
            <div className={`${fontSize} font-bold text-white text-right tracking-tight mt-1 truncate`}>
              {displayText}
            </div>
          </div>

          {/* Кнопки */}
          <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-slate-900">
            {/* Ряд 1 */}
            <button onClick={clear} className={`${BTN} col-span-2 bg-red-100 text-red-700 hover:bg-red-200 text-base`} aria-label="Очистить">C</button>
            <button onClick={backspace} className={`${BTN} bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 text-xl`} aria-label="Удалить последний символ">⌫</button>
            <button onClick={() => append("÷")} className={`${BTN} bg-accent-100 text-accent-700 hover:bg-accent-200`} aria-label="Разделить">÷</button>

            {/* Ряд 2 */}
            <button onClick={() => append("7")} className={`${BTN} bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700`}>7</button>
            <button onClick={() => append("8")} className={`${BTN} bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700`}>8</button>
            <button onClick={() => append("9")} className={`${BTN} bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700`}>9</button>
            <button onClick={() => append("×")} className={`${BTN} bg-accent-100 text-accent-700 hover:bg-accent-200`} aria-label="Умножить">×</button>

            {/* Ряд 3 */}
            <button onClick={() => append("4")} className={`${BTN} bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700`}>4</button>
            <button onClick={() => append("5")} className={`${BTN} bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700`}>5</button>
            <button onClick={() => append("6")} className={`${BTN} bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700`}>6</button>
            <button onClick={() => append("-")} className={`${BTN} bg-accent-100 text-accent-700 hover:bg-accent-200`} aria-label="Вычесть">−</button>

            {/* Ряд 4 */}
            <button onClick={() => append("1")} className={`${BTN} bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700`}>1</button>
            <button onClick={() => append("2")} className={`${BTN} bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700`}>2</button>
            <button onClick={() => append("3")} className={`${BTN} bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700`}>3</button>
            <button onClick={() => append("+")} className={`${BTN} bg-accent-100 text-accent-700 hover:bg-accent-200`} aria-label="Сложить">+</button>

            {/* Ряд 5 */}
            <button onClick={toggleSign} className={`${BTN} bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm`} aria-label="Сменить знак">+/−</button>
            <button onClick={() => append("0")} className={`${BTN} bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700`}>0</button>
            <button onClick={() => append(".")} className={`${BTN} bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700`}>,</button>
            <button
              onClick={calculate}
              className={`${BTN} text-white`}
              style={{ backgroundColor: "#f97316" }}
            aria-label="Вычислить">=</button>
          </div>
        </div>

        {/* История */}
        {history.length > 0 && (
          <div className="mt-6 md:mt-0 flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{UI_TEXT.historyTitle}</p>
              <button
                onClick={() => setHistory([])}
                className="text-xs text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >{UI_TEXT.clearHistory}</button>
            </div>
            <div className="space-y-2">
              {history.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDisplay(item.result);
                    setJustCalculated(true);
                    setExpression("");
                  }}
                  className="card-hover w-full text-right px-4 py-3 block"
                >
                  <div className="text-xs text-slate-400 dark:text-slate-400 truncate">{item.expr}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

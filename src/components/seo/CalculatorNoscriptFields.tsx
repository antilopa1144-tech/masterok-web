import type { CalculatorField } from "@/lib/calculators/types";

interface Props {
  title: string;
  h1: string;
  description: string;
  fields: CalculatorField[];
}

function formatLabel(field: CalculatorField): string {
  const unit = field.unit ? `, ${field.unit}` : "";
  return `${field.label}${unit}`;
}

function renderField(field: CalculatorField) {
  const label = formatLabel(field);
  const id = `calc-field-${field.key}`;
  const defaultValue = String(field.defaultValue);

  switch (field.type) {
    case "number":
      return (
        <div key={field.key} style={{ marginBottom: "12px" }}>
          <label
            htmlFor={id}
            style={{ display: "block", fontWeight: 600, marginBottom: "4px", fontSize: "14px" }}
          >
            {label}
          </label>
          <input
            id={id}
            type="number"
            defaultValue={defaultValue}
            min={field.min}
            max={field.max}
            step={field.step}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #ccc", width: "100%", maxWidth: "320px", fontSize: "14px" }}
          />
          {field.hint && (
            <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{field.hint}</p>
          )}
        </div>
      );
    case "slider":
      return (
        <div key={field.key} style={{ marginBottom: "12px" }}>
          <label
            htmlFor={id}
            style={{ display: "block", fontWeight: 600, marginBottom: "4px", fontSize: "14px" }}
          >
            {label}
          </label>
          <input
            id={id}
            type="range"
            defaultValue={defaultValue}
            min={field.min}
            max={field.max}
            step={field.step || 1}
            style={{ width: "100%", maxWidth: "320px" }}
          />
          <span style={{ fontSize: "13px", color: "#555", marginLeft: "8px" }}>{defaultValue}</span>
        </div>
      );
    case "select":
      return (
        <div key={field.key} style={{ marginBottom: "12px" }}>
          <label
            htmlFor={id}
            style={{ display: "block", fontWeight: 600, marginBottom: "4px", fontSize: "14px" }}
          >
            {label}
          </label>
          <select
            id={id}
            defaultValue={defaultValue}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px", width: "100%", maxWidth: "320px" }}
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    case "radio":
      return (
        <div key={field.key} style={{ marginBottom: "12px" }}>
          <p style={{ fontWeight: 600, marginBottom: "6px", fontSize: "14px" }}>{label}</p>
          {field.options?.map((opt) => (
            <label
              key={opt.value}
              style={{ display: "inline-flex", alignItems: "center", marginRight: "16px", fontSize: "14px", cursor: "pointer" }}
            >
              <input
                type="radio"
                name={field.key}
                value={opt.value}
                defaultChecked={opt.value === field.defaultValue}
                style={{ marginRight: "6px" }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      );
    case "switch":
      return (
        <div key={field.key} style={{ marginBottom: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", cursor: "pointer" }}>
            <input
              type="checkbox"
              id={id}
              defaultChecked={field.defaultValue === 1}
              style={{ marginRight: "8px" }}
            />
            <span style={{ fontWeight: 600 }}>{label}</span>
          </label>
        </div>
      );
    default:
      return null;
  }
}

/**
 * Server-rendered калькулятор для поисковиков (Googlebot).
 *
 * Рендерится внутри <noscript> — обычные пользователи видят интерактивный
 * React-калькулятор, поисковики получают читаемый HTML с полями ввода,
 * их лейблами и подсказками.
 */
export default function CalculatorNoscriptFields({ title, h1, description, fields }: Props) {
  return (
    <noscript>
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "24px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>{h1}</h2>
        <p style={{ fontSize: "15px", color: "#555", marginBottom: "24px", maxWidth: "560px" }}>
          {description}
        </p>

        <div
          style={{
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            background: "#fff",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
            Параметры расчёта
          </h3>
          {fields.map(renderField)}
          <button
            type="submit"
            style={{
              marginTop: "16px",
              padding: "12px 32px",
              background: "#c2410c",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 700,
              cursor: "pointer",
              width: "100%",
              maxWidth: "320px",
            }}
          >
            Рассчитать
          </button>
        </div>

        <p style={{ marginTop: "24px", fontSize: "13px", color: "#999" }}>
          Для интерактивного расчёта включите JavaScript в браузере.
        </p>
      </div>
    </noscript>
  );
}

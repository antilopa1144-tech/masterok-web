"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-secondary flex-1 text-center"
    >
      🖨 Распечатать
    </button>
  );
}

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  const [font, screenshot] = await Promise.all([
    readFile(path.join(process.cwd(), "public/fonts/Roboto-Regular.ttf")),
    readFile(path.join(process.cwd(), "public/images/constructor/room-editor.jpg")),
  ]);
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f8fafc", padding: "44px 48px", fontFamily: "Roboto", color: "#0f172a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28 }}><span style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#ea580c", color: "white", width: 44, height: 44, borderRadius: 9 }}>М</span>Мастерок<span style={{ marginLeft: "auto", fontSize: 20, color: "#64748b" }}>getmasterok.ru</span></div>
      <div style={{ display: "flex", alignItems: "center", flex: 1, gap: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", width: 410 }}><div style={{ fontSize: 51, lineHeight: 1.1, letterSpacing: "-1.8px" }}>Конструктор комнаты в 3D</div><div style={{ marginTop: 24, fontSize: 25, lineHeight: 1.4, color: "#475569" }}>От размеров и раскладки до материалов к покупке</div><div style={{ display: "flex", marginTop: 28, fontSize: 20, color: "#c2410c" }}>Бесплатно · Без регистрации</div></div>
        {/* ImageResponse renders an embedded raster, not a browser image element. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/jpeg;base64,${screenshot.toString("base64")}`} alt="Редактор комнаты Мастерок" width={664} height={374} style={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
      </div>
      <div style={{ display: "flex", fontSize: 21, color: "#475569" }}>Ламинат и плитка · Развёртки стен · Подрезки · Список материалов</div>
    </div>,
    { width: 1200, height: 630, fonts: [{ name: "Roboto", data: font, style: "normal", weight: 400 }] },
  );
}

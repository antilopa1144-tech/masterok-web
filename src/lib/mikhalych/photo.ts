import { CommerceError } from "../commerce/types";
import { getMikhalychChatModel, mikhalychChatCompletion } from "./deepseek-upstream";

const MAX_PHOTO_BYTES = 2_000_000;

export function validatePhoto(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string" || value.length > Math.ceil(MAX_PHOTO_BYTES * 4 / 3) + 100) throw new CommerceError(413, "Фото слишком большое: максимум 2 МБ");
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new CommerceError(400, "Загрузите JPEG, PNG или WebP");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) throw new CommerceError(413, "Фото слишком большое: максимум 2 МБ");
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!(match[1] === "jpeg" && jpeg || match[1] === "png" && png || match[1] === "webp" && webp)) throw new CommerceError(400, "Формат фото не совпадает с содержимым файла");
  return value;
}

/** Extract only visible facts; the model cannot infer dimensions or structural safety from pixels. */
export async function describePhoto(dataUrl: string, question: string): Promise<string> {
  const response = await mikhalychChatCompletion({
    model: getMikhalychChatModel(), stream: false, max_tokens: 650,
    messages: [{ role: "user", content: [
      { type: "text", text: `Опиши для строительного помощника только видимое на фото по вопросу: ${question.slice(0, 1000)}. Не выдумывай размеры, скрытые слои, материалы, дефекты и безопасность конструкции. Укажи, что нельзя определить без замеров.` },
      { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
    ] }],
  }, { clientLabel: "masterok-pro-photo", allowThinking: false, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new CommerceError(502, "Не удалось разобрать фото. Повторите позже.");
  const body = await response.json() as { choices?: { message?: { content?: string } }[] };
  const description = body.choices?.[0]?.message?.content?.trim();
  if (!description) throw new CommerceError(502, "По фото не удалось получить описание");
  return description.slice(0, 2400);
}

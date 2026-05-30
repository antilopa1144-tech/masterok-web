/** OpenAI-совместимые сообщения для DeepSeek tool loop (server-only). */

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface AgentUserMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentRunInput {
  messages: AgentUserMessage[];
  calcContext?: string;
  clientLabel?: string;
  siteOrigin?: string;
}

export interface CalculatorLink {
  slug: string;
  title: string;
  url: string;
}

/** Запись для сохранения в проект (клиент → IndexedDB). */
export interface AgentProjectEntryPayload {
  calcId: string;
  calcTitle: string;
  slug: string;
  categorySlug: string;
  materials: Array<{
    name: string;
    quantity: number;
    unit: string;
    category?: string;
  }>;
  ts: number;
}

export interface AgentRunResult {
  content: string;
  toolsUsed: string[];
  calculatorLinks: CalculatorLink[];
  projectEntries: AgentProjectEntryPayload[];
}

export interface OpenAIToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

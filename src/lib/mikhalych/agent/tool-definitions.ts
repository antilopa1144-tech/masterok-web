import type { OpenAIToolDefinition } from "./types";

/** Схемы tools для DeepSeek / OpenAI function calling. */
export const MIKHALYCH_AGENT_TOOLS: OpenAIToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "list_calculators",
      description:
        "Найти калькуляторы Мастерок по ключевым словам (штукатурка, плитка, стяжка). Вызови перед run_calculator, если slug неочевиден.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Поисковый запрос на русском, например «штукатурка стены»",
          },
          limit: {
            type: "number",
            description: "Макс. результатов (1–12)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_calculator_schema",
      description:
        "Поля калькулятора: ключи, подписи, единицы, дефолты. Нужен перед run_calculator, чтобы не выдумывать имена полей.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Slug калькулятора, например shtukaturka" },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_calculator",
      description:
        "Точный расчёт материалов через движок Мастерок. Единственный источник количеств (мешки, м², шт). Не считай в уме.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Slug калькулятора" },
          values: {
            type: "object",
            description:
              "Числовые значения полей (ключ → число). Неизвестные поля можно опустить — подставятся дефолты.",
            additionalProperties: { type: "number" },
          },
        },
        required: ["slug", "values"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Поиск в интернете (цены, нормы, статьи). Возвращает заголовки и ссылки — для текста страницы вызови fetch_url.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Поисковый запрос на русском" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description:
        "Справочник Мастерок: технология, типовые ошибки, запас, подготовка оснований. Для норм и цен — дополнительно web_search.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Тема на русском" },
          limit: { type: "number" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_url",
      description:
        "Скачать страницу как Markdown (после web_search или по ссылке пользователя). Для цен и норм — с оговоркой об источнике.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Полный URL https://..." },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description:
        "Прогноз погоды на 3 дня для уличных работ (бетон, фасад, кровля, штукатурка). Возвращает температуру, осадки и пригодность к работам. Используй, когда пользователь спрашивает, можно ли вести работы в ближайшие дни или планирует уличный этап.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "Город, например «Москва» или «Казань»" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_material_price",
      description:
        "Ориентир цены строительного материала из поисковой выдачи (НЕ точная цена). Возвращает диапазон цен и ссылки на магазины. Используй, когда нужна примерная стоимость материала; обязательно проговори, что это ориентир и цену стоит уточнить в магазине.",
      parameters: {
        type: "object",
        properties: {
          material: {
            type: "string",
            description: "Материал с уточнением, например «цемент М500 50 кг» или «плитка керамогранит 60х60»",
          },
        },
        required: ["material"],
      },
    },
  },
];

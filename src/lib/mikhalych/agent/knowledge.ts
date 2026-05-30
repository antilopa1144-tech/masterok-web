import knowledgeBase from "./knowledge-base.json";

export interface KnowledgeSnippet {
  id: string;
  topics: string[];
  title: string;
  text: string;
}

const SNIPPETS = knowledgeBase as KnowledgeSnippet[];

export function searchKnowledgeBase(query: string, limit = 5): KnowledgeSnippet[] {
  const q = query.trim().toLowerCase();
  if (!q) return SNIPPETS.slice(0, limit);

  const tokens = q.split(/\s+/).filter((t) => t.length > 1);

  const scored = SNIPPETS.map((s) => {
    const hay = `${s.title} ${s.text} ${s.topics.join(" ")}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (s.topics.some((t) => t.includes(token))) score += 4;
      if (s.title.toLowerCase().includes(token)) score += 3;
      if (hay.includes(token)) score += 1;
    }
    return { s, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s);
}

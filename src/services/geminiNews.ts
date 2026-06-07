import { enqueueGemini } from './geminiQueue';

const API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const MODEL = 'llama-3.3-70b-versatile';
const URL = '/api/groq/openai/v1/chat/completions';

export interface AISummary {
  paragraph: string;
  bullets: string[];
}

const summaryCache = new Map<string, AISummary>();

export async function getNewsSummary(
  stockName: string,
  symbol: string,
  newsTitles: string[],
): Promise<AISummary | null> {
  if (!API_KEY || newsTitles.length === 0) return null;

  const titles = newsTitles.slice(0, 8);
  const cacheKey = `${symbol}::${titles.join('|')}`;
  if (summaryCache.has(cacheKey)) return summaryCache.get(cacheKey)!;

  return enqueueGemini(async () => {
    const code = symbol.replace(/\.TWO?$/i, '');
    const prompt = `你是一位台灣股市分析師。以下是關於${stockName}（${code}）的最新新聞標題：

${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

請根據以上新聞，用繁體中文回覆：
1. 一段2~3句的近期動態摘要
2. 3~5個重點條列（每點20字以內）

只輸出 JSON，不要加任何說明文字或 markdown 格式：
{"paragraph":"...","bullets":["...","...","..."]}`;

    try {
      const res = await fetch(URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 600,
        }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      const text: string = json.choices?.[0]?.message?.content ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const result: AISummary = JSON.parse(match[0]);
      summaryCache.set(cacheKey, result);
      return result;
    } catch { return null; }
  });
}

export type Anchor = {
  text: string;
  before: string;
  after: string;
};

type Point = { kind: 'text'; blockId: string; offset: number };

export type Target = { kind: 'selection'; start: Point; end: Point };

export type Match = {
  snippet: string;
  highlightRange: { start: number; end: number };
  target: Target;
};

export type MatchDoc = {
  query: {
    match(input: {
      select: { type: 'text'; pattern: string; caseSensitive: boolean };
      require: 'any';
    }): Promise<{ evaluatedRevision: string; items: readonly Match[] }>;
  };
};

export type Located =
  | { status: 'found'; target: Target; revision: string; context: number }
  | { status: 'ambiguous'; targets: Target[]; revision: string }
  | { status: 'gone'; revision: string };

export function anchor({ snippet, highlightRange: { start, end } }: Pick<Match, 'snippet' | 'highlightRange'>): Anchor {
  return { text: snippet.slice(start, end), before: snippet.slice(0, start), after: snippet.slice(end) };
}

export async function locate(doc: MatchDoc, anchor: Anchor): Promise<Located> {
  const { evaluatedRevision: revision, items } = await doc.query.match({
    select: { type: 'text', pattern: anchor.text, caseSensitive: true },
    require: 'any',
  });
  if (items.length === 0) return { status: 'gone', revision };

  let best: Match[] = [];
  let bestContext = -1;
  for (const item of items) {
    const context = agreement(anchor, item);
    if (context > bestContext) {
      best = [item];
      bestContext = context;
    } else if (context === bestContext) {
      best.push(item);
    }
  }
  if (best.length > 1) return { status: 'ambiguous', targets: best.map((m) => m.target), revision };
  return { status: 'found', target: best[0].target, revision, context: bestContext };
}

function agreement(anchor: Anchor, { snippet, highlightRange: { start, end } }: Match): number {
  return commonSuffix(anchor.before, snippet.slice(0, start)) + commonPrefix(anchor.after, snippet.slice(end));
}

function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function commonSuffix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
}

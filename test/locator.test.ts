import { describe, expect, it } from 'vitest';
import { anchor, locate, type Match, type MatchDoc } from '../src/locator';

const clause = 'The Supplier shall deliver the Goods within 30 days.';

function match(before: string, after: string, blockId: string, offset: number): Match {
  return {
    snippet: before + clause + after,
    highlightRange: { start: before.length, end: before.length + clause.length },
    target: {
      kind: 'selection',
      start: { kind: 'text', blockId, offset },
      end: { kind: 'text', blockId, offset: offset + clause.length },
    },
  };
}

function doc(items: Match[], onInput?: (input: unknown) => void): MatchDoc {
  return {
    query: {
      async match(input) {
        onInput?.(input);
        return { evaluatedRevision: 'r2', items };
      },
    },
  };
}

const original = match('2. Delivery. ', ' Time is of the essence.', 'p2', 13);
const stored = anchor(original);

describe('anchor', () => {
  it('keeps the matched text and the text on either side', () => {
    expect(stored).toEqual({ text: clause, before: '2. Delivery. ', after: ' Time is of the essence.' });
  });
});

describe('locate', () => {
  it('searches for the exact text', async () => {
    let seen: unknown;
    await locate(doc([original], (input) => (seen = input)), stored);
    expect(seen).toEqual({ select: { type: 'text', pattern: clause, caseSensitive: true }, require: 'any' });
  });

  it('reports gone when the text is no longer in the document', async () => {
    expect(await locate(doc([]), stored)).toEqual({ status: 'gone', revision: 'r2' });
  });

  it('follows the clause when text is inserted above it', async () => {
    const shifted = match('2. Delivery. ', ' Time is of the essence.', 'p2', 61);
    const result = await locate(doc([shifted]), stored);
    expect(result).toEqual({ status: 'found', target: shifted.target, revision: 'r2', context: stored.before.length + stored.after.length });
  });

  it('picks the copy whose surroundings agree with the anchor', async () => {
    const copy = match('Schedule A repeats it: ', ' End of schedule.', 'p9', 23);
    const result = await locate(doc([copy, original]), stored);
    expect(result).toMatchObject({ status: 'found', target: original.target });
  });

  it('refuses when two copies cannot be told apart', async () => {
    const twin = match('2. Delivery. ', ' Time is of the essence.', 'p7', 13);
    const result = await locate(doc([original, twin]), stored);
    expect(result).toEqual({ status: 'ambiguous', targets: [original.target, twin.target], revision: 'r2' });
  });
});

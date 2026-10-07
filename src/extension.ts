import { defineSuperDocExtension } from 'superdoc';
import type { SuperDocExtension } from 'superdoc';
import { locate, type Anchor, type Located, type MatchDoc } from './locator';

export type LocatorExtension = {
  extension: SuperDocExtension;
  refresh(): Promise<void>;
};

export function locatorExtension(
  anchors: readonly Anchor[],
  onLocate: (anchors: readonly Anchor[], results: Located[]) => void,
): LocatorExtension {
  let refresh = async () => {};

  const extension = defineSuperDocExtension({
    id: 'locator',
    activate(ctx) {
      const doc = ctx.doc as unknown as MatchDoc;
      const found = ctx.visuals.highlight('found', { className: 'locator-found' });
      const ambiguous = ctx.visuals.highlight('ambiguous', { className: 'locator-ambiguous' });
      ctx.disposables.add(found);
      ctx.disposables.add(ambiguous);
      let latest = 0;

      refresh = async () => {
        const run = ++latest;
        const current = [...anchors];
        const results = await Promise.all(current.map((a) => locate(doc, a)));
        if (run !== latest) return;
        found.replace(results.flatMap((r) => (r.status === 'found' ? [r.target] : [])));
        ambiguous.replace(results.flatMap((r) => (r.status === 'ambiguous' ? r.targets : [])));
        onLocate(current, results);
      };
      ctx.disposables.add(ctx.onMutation({ affects: ['text', 'block'] }, () => void refresh()));
      void refresh();
    },
  });

  return { extension, refresh: () => refresh() };
}

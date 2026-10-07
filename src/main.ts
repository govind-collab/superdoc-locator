import { SuperDoc } from 'superdoc';
import 'superdoc/style.css';
import { anchor, locate, type Anchor, type Located, type MatchDoc } from './locator';
import { locatorExtension } from './extension';

const anchors: Anchor[] = [];
const list = document.querySelector('#anchors')!;

const { extension, refresh } = locatorExtension(anchors, (current, results) => {
  list.replaceChildren(
    ...results.map((result, i) => {
      const li = document.createElement('li');
      li.textContent = current[i].text;
      li.append(Object.assign(document.createElement('small'), { textContent: describe(result) }));
      return li;
    }),
  );
});

const superdoc = new SuperDoc({
  selector: '#editor',
  document: '/getting-started.docx',
  extensions: [extension],
});

function describe(located: Located): string {
  switch (located.status) {
    case 'found':
      return `found, ${located.context} characters of surrounding text agree`;
    case 'ambiguous':
      return `refused, ${located.targets.length} places match`;
    case 'gone':
      return 'gone';
  }
}

async function anchorSelection() {
  const doc = superdoc.activeEditor?.doc;
  if (!doc) return;
  const selection = await doc.selection.current({ includeText: true });
  if (!selection.target || !selection.text) return;
  const { blockId, range } = selection.target.segments[0];
  const { items } = await doc.query.match({
    select: { type: 'text', pattern: selection.text, caseSensitive: true },
    require: 'any',
  });
  const selected = items.find(
    (item) =>
      item.matchKind === 'text' &&
      item.target.start.kind === 'text' &&
      item.target.start.blockId === blockId &&
      item.target.start.offset === range.start,
  );
  if (!selected || selected.matchKind !== 'text') return;
  anchors.push(anchor(selected));
  await refresh();
}

async function replaceAnchored() {
  const doc = superdoc.activeEditor?.doc;
  if (!doc) return;
  const text = document.querySelector<HTMLInputElement>('#text')!.value;
  if (!text) return;
  for (const current of [...anchors]) {
    const located = await locate(doc as MatchDoc, current);
    if (located.status !== 'found') continue;
    const receipt = await doc.replace(
      { target: located.target, text, expectedText: current.text },
      { changeMode: 'tracked' },
    );
    if (receipt.success) anchors.splice(anchors.indexOf(current), 1);
  }
  await refresh();
}

document.querySelector('#anchor')!.addEventListener('click', anchorSelection);
document.querySelector('#replace')!.addEventListener('click', replaceAnchored);

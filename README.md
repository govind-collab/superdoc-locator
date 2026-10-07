# superdoc-locator

Anchors for edits in a [SuperDoc](https://superdoc.dev) document. An anchor remembers a stretch of text and the text around it, finds it again after the document has changed, and refuses when it cannot tell two copies apart.

SuperDoc's Document API hands out targets that belong to one document revision. A `query.match` ref stops resolving after any mutation and an extension anchor fails closed to stale, so code that keeps a location across edits has to find the text again. Searching for the text alone is not enough: `require: 'exactlyOne'` throws when a clause appears twice and nothing in the selector says which copy was meant.

`anchor(match)` keeps the matched text and the snippet on either side of it. `locate(doc, anchor)` runs `query.match` for the exact text and scores each hit by how many characters of surrounding text agree with the anchor. A single best hit is `found`, with its target and the revision to pass as `expectedRevision`. A tie is `ambiguous`. No hit is `gone`.

`locatorExtension(anchors, onLocate)` wraps that in a v2 extension. It re-locates every anchor after each mutation, local or remote, highlights the found and the ambiguous ones, and reports the results.

## Demo

```
npm install
npm run dev
```

Select some text and click Anchor selection. Then type above the clause, or paste a copy of it somewhere else, and watch the status change. Replace anchored text applies a tracked replacement to the anchors that resolve to one place and skips the rest.

`npm test` runs the unit tests for the locator.

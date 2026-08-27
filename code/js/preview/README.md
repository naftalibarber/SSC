# SSC Native Preview V1

This directory is the start of SSC's own preview infrastructure.

## Current scope

- Generic NxN state engine for orders 2-7.
- WCA-style outer and wide cube moves used by NxN scrambles.
- Normalized state output using face identities (`U D F B R L`), not colors.
- Deterministic sticker IDs such as `U1`, `U2`, `F9`.
- Generic SVG net renderer shared by 2x2-7x7.
- Palette is applied only in the renderer.
- Development lab at `/preview-lab.html`.

## Data flow

```text
Scramble
  -> SSCNxNState
  -> normalized face state
  -> sticker mapping
  -> SSCSvgCubeRenderer
  -> SVG
```

## Public APIs

### State

```js
const state = SSCNxNState.buildState("R U R'", 3, { strict: true });
```

State shape:

```js
{
  order: 3,
  moves: [...],
  ignoredMoves: [],
  faces: {
    U: [[...], [...], [...]],
    L: [[...], [...], [...]],
    F: [[...], [...], [...]],
    R: [[...], [...], [...]],
    B: [[...], [...], [...]],
    D: [[...], [...], [...]]
  },
  mapping: {
    U1: 'F',
    U2: 'U',
    ...
  }
}
```

### Renderer

```js
SSCSvgCubeRenderer.render(container, {
  scramble: "R U R'",
  order: 3,
  colors: { U:'#fff', D:'#ffd500', F:'#16a34a', B:'#2563eb', R:'#ef4444', L:'#f97316' }
});
```

### Facade

```js
SSCPreviewV1.render(container, scramble, '333');
```

## Safety rule

V1 is intentionally isolated from the production preview pipeline until visual/state tests are complete. Do not route `SSCCubePreview.render()` to V1 before 2x2 and 3x3 are verified against known scrambles.

## Next steps

1. Verify solved state, inverse turns, and known 2x2/3x3 scrambles in Preview Lab.
2. Add comparison tests against the current preview/cubing.js state.
3. Connect 2x2 and 3x3 production 2D preview to V1.
4. Extend production connection to 4x4-7x7.
5. Build a 3D renderer that consumes the exact same normalized state.

# Electron Window Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start Brook in a resizable `1280x720` desktop window instead of forced fullscreen while keeping the current non-primary-display targeting behavior.

**Architecture:** Add a side-effect-free `src/main/window-options.ts` module that owns display selection, workArea-based bounds math, and the complete `BrowserWindow` option object. Keep `src/main/index.ts` responsible for app startup, but replace its inline window option assembly with the new seam so the behavior is covered by pure Vitest tests instead of importing the Electron entry module.

**Tech Stack:** Electron 33, TypeScript 5.7, Vitest, electron-vite

---

## File Map

- Create: `src/main/window-options.ts` - side-effect-free `createMainWindowOptions(...)` plus a tiny `createMainWindow(...)` seam-boundary helper for constructor forwarding
- Modify: `src/main/index.ts` - replace inline fullscreen window construction with the new side-effect-free seam
- Create: `tests/main/window-options.test.ts` - Vitest coverage for display selection, workArea sizing, fallback rules, exact preserved options, and seam-boundary constructor forwarding

## Implementation Notes

- Follow `@test-driven-development` strictly: add the failing test first, run it red, then write the minimum code to get back to green.
- Keep the new module pure and side-effect-free; do not move config loading, theme manager setup, poller startup, IPC registration, or web-server startup out of `src/main/index.ts`.
- Preserve the existing top-level `BrowserWindow` flags and the existing `webPreferences` subtree unchanged, except for the allowed window-mode changes (`fullscreen: false`, explicit `resizable: true`, and the new bounds).
- Treat `1280x720` as outer-window bounds and use `workArea`, not `bounds`, for placement math.
- Avoid importing `src/main/index.ts` in tests; test the side-effect-free seam instead.
- `createMainWindow(...)` is intentionally tiny constructor forwarding only; it exists to satisfy the spec's seam-boundary assertion without turning startup into a broader abstraction.

---

### Task 1: Add the pure window-options seam for the happy path

**Files:**

- Create: `src/main/window-options.ts`
- Create: `tests/main/window-options.test.ts`
- Reference: `src/main/index.ts`

- [ ] **Step 1: Write the failing happy-path test first**

```ts
import { describe, expect, it } from "vitest";
import { createMainWindowOptions } from "../../src/main/window-options";

describe("createMainWindowOptions", () => {
  it("uses the first non-primary display and returns a windowed 1280x720 option object", () => {
    const primary = {
      id: 1,
      workArea: { x: 0, y: 25, width: 1440, height: 875 },
      bounds: { x: 0, y: 0, width: 1440, height: 900 },
    } as const;
    const secondary = {
      id: 2,
      workArea: { x: 1440, y: 0, width: 1920, height: 1080 },
      bounds: { x: 1440, y: 0, width: 1920, height: 1080 },
    } as const;
    const tertiary = {
      id: 3,
      workArea: { x: 3360, y: 0, width: 2560, height: 1440 },
      bounds: { x: 3360, y: 0, width: 2560, height: 1440 },
    } as const;

    const options = createMainWindowOptions(
      [primary, secondary, tertiary],
      primary,
    );

    expect(options).toEqual({
      x: 1760,
      y: 180,
      width: 1280,
      height: 720,
      fullscreen: false,
      fullscreenable: true,
      resizable: true,
      frame: true,
      transparent: false,
      backgroundColor: "#000000",
      webPreferences: {
        preload: expect.stringMatching(/[\\/]preload[\\/]index\.js$/),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run tests/main/window-options.test.ts`
Expected: FAIL because `src/main/window-options.ts` does not exist yet.

- [ ] **Step 3: Implement the smallest working seam**

```ts
import type {
  BrowserWindowConstructorOptions,
  BrowserWindow as BrowserWindowType,
  Display,
} from "electron";
import { join } from "node:path";

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

type DisplayLike = Pick<Display, "id" | "workArea">;
type BrowserWindowCtor = new (
  options: BrowserWindowConstructorOptions,
) => BrowserWindowType;

export function createMainWindowOptions(
  displays: DisplayLike[],
  primaryDisplay?: Pick<Display, "id">,
): BrowserWindowConstructorOptions {
  const target =
    displays.find((display) => display.id !== primaryDisplay?.id) ??
    displays[0]!;
  const x = Math.round(
    target.workArea.x + (target.workArea.width - DEFAULT_WIDTH) / 2,
  );
  const y = Math.round(
    target.workArea.y + (target.workArea.height - DEFAULT_HEIGHT) / 2,
  );

  return {
    x,
    y,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    fullscreen: false,
    fullscreenable: true,
    resizable: true,
    frame: true,
    transparent: false,
    backgroundColor: "#000000",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  };
}

export function createMainWindow(
  BrowserWindowCtor: BrowserWindowCtor,
  displays: DisplayLike[],
  primaryDisplay?: Pick<Display, "id">,
) {
  const options = createMainWindowOptions(displays, primaryDisplay);
  return new BrowserWindowCtor(options);
}
```

- [ ] **Step 4: Re-run the test and confirm it goes green**

Run: `npx vitest run tests/main/window-options.test.ts`
Expected: PASS with the new happy-path test green.

- [ ] **Step 5: Commit the seam baseline**

```bash
git add src/main/window-options.ts tests/main/window-options.test.ts
git commit -m "test: add main window options seam"
```

---

### Task 2: Cover the spec edge cases on the pure seam

**Files:**

- Modify: `src/main/window-options.ts`
- Modify: `tests/main/window-options.test.ts`

- [ ] **Step 1: Add failing tests for the selection fallback cases**

```ts
it("keeps the single available display when there is no non-primary target", () => {
  const only = {
    id: 7,
    workArea: { x: 50, y: 20, width: 1600, height: 900 },
    bounds: { x: 0, y: 0, width: 1600, height: 940 },
  } as const;

  const options = createMainWindowOptions([only], only);

  expect(options).toMatchObject({ x: 210, y: 110, width: 1280, height: 720 });
});

it("falls back to displays[0] when the provided primary display is missing from the list", () => {
  const first = {
    id: 10,
    workArea: { x: 100, y: 30, width: 1501, height: 901 },
    bounds: { x: 0, y: 0, width: 1600, height: 940 },
  } as const;
  const second = {
    id: 11,
    workArea: { x: 1700, y: 0, width: 1920, height: 1080 },
    bounds: { x: 1600, y: 0, width: 1920, height: 1080 },
  } as const;

  const options = createMainWindowOptions([first, second], {
    id: 999,
  } as const);

  expect(options).toMatchObject({ x: 211, y: 121, width: 1280, height: 720 });
});
```

- [ ] **Step 2: Run the test file and confirm the new selection cases fail**

Run: `npx vitest run tests/main/window-options.test.ts`
Expected: FAIL on the new single-display and missing-primary assertions.

- [ ] **Step 3: Implement only the selection fallback logic needed to satisfy those tests**

```ts
const target =
  displays.find((display) => display.id !== primaryDisplay?.id) ?? displays[0];
```

- [ ] **Step 4: Add failing tests for workArea sizing, clamping, and empty-display fallback**

```ts
it("uses workArea rather than bounds when calculating size and position", () => {
  const display = {
    id: 1,
    workArea: { x: 200, y: 60, width: 1024, height: 640 },
    bounds: { x: 0, y: 0, width: 1280, height: 800 },
  } as const;

  const options = createMainWindowOptions([display], display);

  expect(options).toMatchObject({ x: 200, y: 60, width: 1024, height: 640 });
});

it("returns a hardcoded origin fallback when no displays are available", () => {
  expect(createMainWindowOptions([], undefined)).toEqual({
    x: 0,
    y: 0,
    width: 1280,
    height: 720,
    fullscreen: false,
    fullscreenable: true,
    resizable: true,
    frame: true,
    transparent: false,
    backgroundColor: "#000000",
    webPreferences: {
      preload: expect.stringMatching(/[\\/]preload[\\/]index\.js$/),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
});
```

- [ ] **Step 5: Run the test file and confirm the workArea/clamp/fallback cases fail**

Run: `npx vitest run tests/main/window-options.test.ts`
Expected: FAIL on the workArea, clamp, or empty-display fallback assertions.

- [ ] **Step 6: Implement only the workArea, clamp, and hardcoded empty-display fallback logic needed to satisfy those tests**

```ts
if (!target) {
  return fallbackOptions();
}

const width = Math.min(DEFAULT_WIDTH, target.workArea.width);
const height = Math.min(DEFAULT_HEIGHT, target.workArea.height);
const x = Math.round(target.workArea.x + (target.workArea.width - width) / 2);
const y = Math.round(target.workArea.y + (target.workArea.height - height) / 2);
```

- [ ] **Step 7: Add one more failing test for exact preserved options, integer rounding, and seam-boundary constructor forwarding**

```ts
it("preserves the existing BrowserWindow flags and webPreferences subtree", () => {
  const display = {
    id: 1,
    workArea: { x: 100, y: 31, width: 1501, height: 901 },
    bounds: { x: 0, y: 0, width: 1501, height: 901 },
  } as const;

  const options = createMainWindowOptions([display], display);

  expect(options).toEqual({
    x: 211,
    y: 122,
    width: 1280,
    height: 720,
    fullscreen: false,
    fullscreenable: true,
    resizable: true,
    frame: true,
    transparent: false,
    backgroundColor: "#000000",
    webPreferences: {
      preload: expect.stringMatching(/[\\/]preload[\\/]index\.js$/),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
});

it("passes the exact generated options into the BrowserWindow constructor at the seam boundary", () => {
  const display = {
    id: 2,
    workArea: { x: 1440, y: 0, width: 1920, height: 1080 },
    bounds: { x: 1440, y: 0, width: 1920, height: 1080 },
  } as const;
  const BrowserWindowCtor = vi.fn();

  createMainWindow(BrowserWindowCtor as any, [display], display);

  expect(BrowserWindowCtor).toHaveBeenCalledWith(
    createMainWindowOptions([display], display),
  );
});
```

Run: `npx vitest run tests/main/window-options.test.ts`
Expected: FAIL until the exact option object and `createMainWindow(...)` forwarding are fully covered.

- [ ] **Step 8: Make the minimum implementation updates and return the test file to green**

Run: `npx vitest run tests/main/window-options.test.ts`
Expected: PASS with all required seam cases green, including 3+ displays, single display, missing primary, empty list, workArea, integer rounding, preserved flags, and constructor forwarding.

- [ ] **Step 9: Commit the completed seam coverage**

```bash
git add src/main/window-options.ts tests/main/window-options.test.ts
git commit -m "test: cover main window option edge cases"
```

---

### Task 3: Replace the inline fullscreen setup in the Electron entrypoint

**Files:**

- Modify: `src/main/index.ts`
- Reference: `src/main/window-options.ts`

- [ ] **Step 1: Re-run the seam test to establish a green baseline before touching `src/main/index.ts`**

Run: `npx vitest run tests/main/window-options.test.ts`
Expected: PASS so the entrypoint change is the only moving part in this task.

- [ ] **Step 2: Update `src/main/index.ts` to use the side-effect-free seam**

```ts
import { app, BrowserWindow, screen } from "electron";
import { createMainWindow } from "./window-options";

async function createWindow(): Promise<void> {
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const win = createMainWindow(BrowserWindow, displays, primaryDisplay);

  // keep the rest of the startup flow unchanged
}
```

- [ ] **Step 3: Re-run the seam tests and a node typecheck to confirm the wiring change did not regress the contract**

Run: `npx vitest run tests/main/window-options.test.ts && npm run typecheck:node`
Expected: PASS with the seam still green and `src/main/index.ts` still type-safe after it stops constructing fullscreen options inline.

- [ ] **Step 4: Commit the entrypoint wiring change**

```bash
git add src/main/index.ts src/main/window-options.ts tests/main/window-options.test.ts
git commit -m "feat: launch electron app in windowed mode"
```

---

### Task 4: Run the full verification pass

**Files:**

- Verify: `src/main/index.ts`
- Verify: `src/main/window-options.ts`
- Verify: `tests/main/window-options.test.ts`

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`
Expected: PASS with the existing test suite plus the new main-process seam coverage green.

- [ ] **Step 2: Run the TypeScript verification**

Run: `npm run typecheck`
Expected: PASS with no type errors in `src/main/` or `tests/main/`.

- [ ] **Step 3: Run the app manually and validate the approved windowed behavior**

Run: `npm run dev`
Expected manual checks:

- startup is a normal window, not fullscreen
- startup outer bounds are about `1280x720`
- confirm that `1280x720` refers to the native outer window bounds, not only the renderer content area
- the preferred non-primary display is still chosen when available
- startup is centered within the chosen display's `workArea`
- startup is fully visible within the chosen display's usable area
- the window can be dragged normally by its native title bar
- the window can be minimized normally with native window controls
- shrinking the window well below `1280x720`, then maximizing, then entering and leaving fullscreen all behave normally
- the current lyric line is not clipped at the default size
- the bottom control bar remains reachable at the default size
- the settings UI remains usable at the default size
- closing the window still exits the app the same way it does today
- if the default size exposes clipped lyrics, unreachable controls, or unusable settings, stop and record it as a separate follow-up instead of expanding this change's scope

- [ ] **Step 4: Stop here if verification is green; do not create an empty commit**

Expected: no additional commit is needed unless manual verification uncovers a real fix.

---

## Done Criteria

- `src/main/window-options.ts` exists and is side-effect-free
- `createMainWindowOptions(...)` owns display selection, workArea bounds math, and the full `BrowserWindow` option object
- `src/main/index.ts` no longer constructs a fullscreen window inline
- startup defaults are windowed, resizable, and `1280x720` outer bounds
- existing `BrowserWindow` flags and `webPreferences` are preserved, except for the allowed window-mode changes
- `tests/main/window-options.test.ts` covers the required display-selection, fallback, workArea, clamping, rounding, and seam-boundary forwarding cases
- `npm test` and `npm run typecheck` both pass
- manual `npm run dev` validation confirms windowed startup, free resizing, renderer usability, and unchanged close-to-exit behavior

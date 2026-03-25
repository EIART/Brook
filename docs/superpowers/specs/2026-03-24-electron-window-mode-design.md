# Electron Window Mode Design Spec

**Date:** 2026-03-24
**Status:** Approved

---

## Overview

Adjust Brook's Electron shell so the app starts in a normal desktop window instead of forced fullscreen. The window should be freely resizable by the user and remain compatible with the existing display-targeting logic.

---

## User-Facing Design Decisions

### 1. Startup Mode: Windowed by Default

- The app no longer launches in true fullscreen.
- The first window opens at a standard desktop size instead of filling the entire display.
- Recommended initial size: `1280x720`.

### 2. Window Behavior: Standard Desktop Controls

- Keep the native title bar and frame.
- Allow manual resize, drag, maximize, minimize, and close.
- Keep fullscreen capability available through the OS window controls, but do not force it on startup.

### 3. Display Targeting: Preserve Current Screen Selection

- Keep the existing logic that prefers the non-primary display when available.
- For multi-monitor setups with more than one non-primary display, preserve the current behavior exactly: choose the first non-primary display returned by Electron.
- The window should still open on the chosen target display.
- Only the initial size changes; display selection behavior does not.

---

## Technical Design

### Main Process Changes

The primary change is in `src/main/index.ts`, where the `BrowserWindow` is created. To keep the behavior testable and deterministic without over-refactoring the startup flow, `createWindow()` stays inline and only the window-selection / window-options path may be isolated for testing.

- `createMainWindowOptions(displays, primaryDisplay)`: required pure seam for testing. It owns the full display-selection and complete `BrowserWindowConstructorOptions` construction path. Its target-display rule is canonical: choose the first non-primary display when one exists; otherwise choose `displays[0]`; if `displays` is empty, use the explicit hardcoded fallback described below.
- `getInitialWindowBounds(displays, primaryDisplay)` is optional. If extracted, it must remain a tiny pure helper used only beneath `createMainWindowOptions(...)`.
- `createMainWindowOptions(...)` must live in a side-effect-free module (for example `src/main/window-options.ts`), not in a module that boots the Electron app on import.
- It is explicitly allowed to move only this window-options path into that tiny dedicated module so tests can cover it without pulling in config/theme/poller/web-server startup.

No broader startup refactor is allowed beyond that testability seam, and the test plan should rely on that seam instead of broad module-level mocking of the full startup path. The extracted seam must stay pure and must not pull config loading, theme management, poller startup, IPC registration, or web-server startup into the extracted module.

The extracted seam owns the entire `BrowserWindow` constructor options object. All existing non-window-mode options must be preserved unchanged through this extraction, including the current `preload`, `contextIsolation`, `nodeIntegration`, `frame`, `transparent`, and `backgroundColor` settings. The only intended option changes are the startup window-mode/bounds fields plus an explicit `resizable: true`.

- Remove forced startup fullscreen by setting `fullscreen` to `false`.
- Keep `fullscreenable: true` so users can still enter fullscreen manually.
- Ensure the window is explicitly resizable with `resizable: true`.
- Replace the current `width` and `height` values derived from the target display bounds with a default requested size of `1280x720`.
- `1280x720` refers to the Electron window's outer bounds, using default `BrowserWindow` sizing semantics; do not introduce `useContentSize` in this change.
- Base placement on the target display's `workArea`, not raw `bounds`, so the initial window respects menu bar and dock space.
- Open the window centered within the target display's `workArea`.
- Clamp the initial size so it never exceeds the target display's usable `workArea`.
- Round computed `x` and `y` to integers before creating the window.

### Sizing and Positioning Rules

- Default requested size is `1280x720` outer-window bounds.
- Actual initial size is `min(requestedSize, target.workAreaSize)` on each axis.
- Initial position is computed so the window is centered within the target display's `workArea`.
- This guarantees the window starts fully visible on the intended display, even on smaller screens.
- No persistence layer is added for remembered size or position in this change.
- No new config fields are added to `config.json`.

### Renderer Impact

- Renderer code changes are out of scope for this feature.
- The existing renderer must be manually validated at windowed `1280x720` size because the app was originally designed around fullscreen usage.
- If validation reveals a blocking layout issue, that should be surfaced as a separate follow-up change instead of expanding the scope of this implementation.
- For this feature, a blocking layout issue means any of the following at the default window size: the current lyric line is clipped off-screen, the bottom control bar cannot be reached or seen, or the settings UI becomes unusable without additional layout changes.

---

## Data Flow

1. App becomes ready.
2. Main process reads the current display list and primary display from Electron `screen`.
3. `createMainWindowOptions(...)` applies the existing secondary-monitor preference, selects the target display, derives bounds from that display's `workArea`, applies requested outer-window size `1280x720`, clamps, centers, rounds coordinates, and returns the final window options.
4. `BrowserWindow` is created in windowed mode with those computed options.
5. Renderer loads normally and all existing IPC, poller, theme, and web server behavior remains unchanged.

---

## Error Handling and Edge Cases

- **Single-monitor setup:** the app still falls back to `displays[0]`, which is the only available display.
- **Small displays:** the helper clamps the initial size to the target display's usable `workArea` so the window starts fully visible.
- **Menu bar / dock reserved space:** using `workArea` prevents the initial placement from overlapping reserved desktop UI areas.
- **Display availability changes:** target-display selection always follows the canonical rule above using the current launch-time display list; there is no remembered display affinity across runs.
- **Nonzero origins / odd workArea sizes:** centering math must use the `workArea` origin and return integer-rounded coordinates.
- **Defensive display fallback:** if Electron returns an empty display list, the helper returns plain hardcoded fallback bounds `{ x: 0, y: 0, width: 1280, height: 720 }` with the same window-mode flags; this path does not attempt centering or workArea clamping because no display geometry is available.
- **Malformed display geometry:** handling corrupted or partial Electron display objects beyond an empty display list is out of scope for this change.
- **Topology changes between runs:** because no window bounds are persisted, each launch recalculates target display and bounds from the current monitor setup.
- **Window close / app lifecycle:** startup-window mode changes do not alter current app lifecycle behavior; closing the only window should continue to exit the app through the existing shell flow, and no macOS `activate` reopen behavior is added in this change.
- **User enters fullscreen later:** supported through standard Electron/OS behavior because `fullscreenable` remains enabled.
- **Window resizing:** no custom resize listeners or layout enforcement are introduced in this change; shrinking well below `1280x720`, maximizing, and entering/leaving fullscreen after launch all rely on standard Electron/native window behavior.

---

## Testing Strategy

### Manual Verification

- Launch the app and confirm it opens in a normal window instead of fullscreen.
- Confirm the initial window size is approximately `1280x720`.
- Confirm this means the native window outer bounds, not renderer content area.
- Confirm the window appears on the same target display the app currently prefers.
- Confirm the window starts fully visible and centered within the display's usable area.
- Confirm the window can be resized freely by dragging its edges/corners.
- Confirm maximize/fullscreen from native window controls still works.
- Confirm the app still behaves acceptably after shrinking the window well below the default size, then maximizing, then entering and leaving fullscreen.
- Confirm the renderer remains usable at the default window size with no critical clipping or unreachable controls.
- Confirm closing the window still exits the app the same way it does today.
- Manual renderer usability sign-off for `1280x720` is required before considering the feature done; no automated renderer smoke test is required in this spec.

### Automated Verification

- The repo already contains `tests/main` coverage for main-process modules, so this change should add a focused unit test for the extracted window-bounds helper.
- The repo already contains `tests/main` coverage for main-process modules, so this change must add focused coverage for the exported `createMainWindowOptions(...)` seam.
- The automated test should cover at least:
  - secondary-display preference when a non-primary display exists
  - first-non-primary selection behavior when 3+ displays exist
  - primary-display fallback when only one display exists
  - non-empty displays plus missing/mismatched `primaryDisplay`, which must fall back to `displays[0]`
  - defensive fallback when the display list is empty
  - clamping when the target `workArea` is smaller than `1280x720`
  - centering math within the chosen display's `workArea`
  - integer rounding of centered `x` and `y`
  - use of `workArea` origin/size instead of raw display `bounds`
- The regression test must assert the final options produced by `createMainWindowOptions(...)`, including `fullscreen: false`, `fullscreenable: true`, `resizable: true`, the computed bounds, and preservation of the existing non-window-mode options.
- That regression test must verify end-to-end within the extracted seam that the `screen.getAllDisplays()` / `getPrimaryDisplay()` inputs still produce the correct non-primary-display preference, not just isolated centering math.
- If `getInitialWindowBounds(...)` is extracted, it may also receive its own focused pure-unit tests, but that is optional; the required test target is `createMainWindowOptions(...)`.
- The spec does not require tests to drive the full `createWindow()` startup path with config, theme manager, pollers, IPC, and web server boot; tests should target the exported `createMainWindowOptions(...)` seam and any tiny pure helper beneath it.
- Add one thin integration assertion at the side-effect-free seam boundary that verifies the options object produced for startup is the same object shape ultimately handed to `new BrowserWindow(...)`; this must not require importing the side-effectful Electron entry module.
- Implementation verification should also run `npm test` and `npm run typecheck`.

---

## Out of Scope

- Remembering the last window size or position.
- Adding a settings toggle for fullscreen vs windowed startup.
- Adding custom IPC or menu actions for window mode switching.
- Changing renderer layout specifically for small windows.
- Changing macOS app activation / reopen behavior.

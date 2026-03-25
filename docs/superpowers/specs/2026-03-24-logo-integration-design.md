# Logo Integration Design Spec

**Date:** 2026-03-24
**Status:** Draft

---

## Overview

Add a single project logo based on the user-provided raster image and use it consistently across the app's web surface and Electron packaging outputs.

The source image is the current low-resolution logo provided in chat. We will not redraw the mark. We will do light normalization only: crop, scale, and export to the formats required by the app.

---

## Goals

1. Use one consistent logo asset set everywhere the app exposes branding.
2. Cover both runtime web branding and packaged desktop branding.
3. Keep the implementation simple and compatible with the existing Electron + Vite + electron-builder stack.

---

## Non-Goals

- Rebranding the app UI beyond logo replacement
- Redrawing the mark as vector artwork
- Adding animated logos, tray icons, or platform-specific alternate brand systems

---

## Design Decisions

### 1. Source of Truth

Create a dedicated asset source directory for the provided logo image, then generate all derived files from that source.

Proposed structure:

```text
build-assets/
  logo/
    source.png
    icon-16.png
    icon-32.png
    icon-48.png
    icon-64.png
    icon-128.png
    icon-256.png
    icon-512.png
    favicon.ico
    icon.ico
    icon.icns
src/
  renderer/
    public/
      branding/
        favicon.ico
        favicon-32.png
```

This keeps branding assets separate from app code and makes future replacement straightforward.

### 2. Asset Processing Strategy

Use an exact, reproducible open-source toolchain to convert the provided image into the required formats.

Planned generation flow:

1. Commit the user-provided image as `build-assets/logo/source.png`
2. Add a small checked-in generation script, e.g. `scripts/generate-icons.mjs`
3. Use one open-source Node-based icon generator from that script to emit PNG sizes plus `ico` / `icns`
4. Copy the web favicon outputs into `src/renderer/public/branding/`

The processing is intentionally light-touch:

- preserve the original black-background / white-mark look
- normalize canvas and padding so small sizes stay centered
- export multiple square PNG sizes
- generate `src/renderer/public/branding/favicon.ico` for web
- generate `src/renderer/public/branding/favicon-32.png` for modern favicon consumers
- generate `build-assets/logo/icon.ico` for Windows packaging
- generate `build-assets/logo/icon.icns` for macOS packaging
- generate `build-assets/logo/icon-512.png` for Linux packaging

Preferred implementation tool: `icon-gen` or an equivalent OSS Node package with the same committed script entrypoint. The repo should expose one deterministic regeneration command so future replacements do not depend on manual steps.

Because the user approved the existing low-resolution raster as the source, minor softness at very small sizes is acceptable.

### 3. Web Integration

Use Vite's renderer `public` directory explicitly so assets are copied into the built renderer output without extra server logic.

Add favicon references to the renderer HTML entry so the app window/web surface uses the new icon consistently.

Expected integration points:

- `src/renderer/index.html`
- `src/renderer/public/branding/favicon.ico`
- `src/renderer/public/branding/favicon-32.png`

At minimum, wire:

- `<link rel="icon" href="/branding/favicon.ico" sizes="any">`
- `<link rel="icon" type="image/png" href="/branding/favicon-32.png" sizes="32x32">`

This pathing is compatible with the current static serving behavior in `src/main/web-server.ts`, which serves files directly from the built renderer output directory.

### 4. Electron Packaging Integration

Add explicit `build` configuration for `electron-builder` in the root `package.json` so packaged apps use the new icon set.

Expected settings:

- keep package identity unchanged; do not rename the app as part of this task
- set `build.directories.buildResources` to `build-assets`
- set `build.mac.icon` -> `build-assets/logo/icon.icns`
- set `build.win.icon` -> `build-assets/logo/icon.ico`
- set `build.linux.icon` -> `build-assets/logo/icon-512.png`

If `build.icon` is added as a shared fallback, it should point at `build-assets/logo/icon-512.png`; platform-specific fields remain the source of truth.

This keeps packaging deterministic and avoids relying on defaults.

### 5. Scope of Replacement

This change should cover all current project-visible logo entry points that exist in this repository:

- renderer favicon
- Electron packaged app icon
- packaging configuration defaults tied to icon assets

If a runtime window icon API is already used in main-process code, it should also be pointed to the same generated asset set. If not present, no extra runtime-only icon mechanism needs to be introduced unless required by platform behavior.

---

## Implementation Notes

### Files likely to change

- `package.json`
- `src/renderer/index.html`
- new generated files under `build-assets/logo/`

### Tooling expectations

- use one small OSS Node-based generator and one checked-in script entrypoint
- expose a regeneration command such as `npm run generate:icons`
- commit the generated outputs so packaging does not depend on regeneration at install time
- avoid introducing a complex build pipeline just for icons

### Validation

Verify:

1. renderer HTML references `/branding/favicon.ico` and `/branding/favicon-32.png`
2. generated files exist at the exact committed paths defined above
3. `package.json` icon paths match those exact files
4. `npm run build` still succeeds
5. `npm run build:unpack` succeeds so `electron-builder` resolves the icon files during packaging

---

## Risks and Tradeoffs

- The provided source image is small, so very small icon sizes may lose edge sharpness.
- A pure conversion workflow is fast and faithful, but lower quality than a manual vector redraw.
- Keeping the original black square background preserves the supplied identity, but may look heavier than a transparent-background icon in some OS contexts.

Given the user's explicit preference to use the current image directly, this is the right tradeoff for now.

---

## Success Criteria

- Browser/favicon surfaces show the new logo
- Packaged Electron builds use the new logo assets
- All icon outputs derive from one project-local source asset
- The integration does not change unrelated UI behavior

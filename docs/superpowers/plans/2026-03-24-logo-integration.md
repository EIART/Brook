# Logo Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one project-local logo source, generate the required favicon and Electron package icon assets from it, and wire those assets into the renderer and `electron-builder` config.

**Architecture:** Keep one committed raster source under `build-assets/logo/`, generate all derived assets through a checked-in script, and reference only the derived outputs from the renderer and packaging config. Web favicon delivery uses `src/renderer/public/branding/` so Vite copies the assets into the built renderer output automatically, while desktop packaging reads icon files from `build-assets/logo/` through explicit `electron-builder` paths.

**Tech Stack:** Electron 33, electron-vite, React 18, Vitest, Node.js scripts, `electron-builder`, one OSS icon generation package such as `icon-gen`

---

## File Map

- Create: `build-assets/logo/source.png` - committed source image based on the user-provided logo
- Create: `build-assets/logo/icon-16.png` - generated square PNG
- Create: `build-assets/logo/icon-32.png` - generated square PNG
- Create: `build-assets/logo/icon-48.png` - generated square PNG
- Create: `build-assets/logo/icon-64.png` - generated square PNG
- Create: `build-assets/logo/icon-128.png` - generated square PNG
- Create: `build-assets/logo/icon-256.png` - generated square PNG
- Create: `build-assets/logo/icon-512.png` - generated square PNG and Linux package icon
- Create: `build-assets/logo/favicon.ico` - generated source favicon artifact
- Create: `build-assets/logo/icon.ico` - Windows package icon
- Create: `build-assets/logo/icon.icns` - macOS package icon
- Create: `src/renderer/public/branding/favicon.ico` - web favicon copied from generated output
- Create: `src/renderer/public/branding/favicon-32.png` - modern PNG favicon
- Create: `scripts/generate-icons.mjs` - deterministic asset generation script
- Create: `tests/branding/generate-icons.test.ts` - test for icon generation behavior and failure modes
- Create: `tests/branding/package-builder-branding.test.ts` - test for `electron-builder` icon paths
- Create: `tests/renderer/index-html-branding.test.ts` - test for favicon links in renderer HTML
- Modify: `package.json` - add generator dependency, `generate:icons` script, and explicit `electron-builder` icon config
- Modify: `package-lock.json` - lock the icon generation dependency
- Modify: `src/renderer/index.html` - add favicon link tags

---

### Task 1: Add favicon contract test for renderer HTML

**Files:**

- Create: `tests/renderer/index-html-branding.test.ts`
- Modify: `src/renderer/index.html`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("renderer HTML branding", () => {
  it("includes both ico and png favicon links", () => {
    const html = readFileSync(
      resolve(here, "../../src/renderer/index.html"),
      "utf8",
    );

    expect(html).toContain('href="/branding/favicon.ico"');
    expect(html).toContain('href="/branding/favicon-32.png"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/renderer/index-html-branding.test.ts`
Expected: FAIL because `src/renderer/index.html` does not yet include those favicon links.

- [ ] **Step 3: Write minimal implementation**

Add these tags inside `src/renderer/index.html`:

```html
<link rel="icon" href="/branding/favicon.ico" sizes="any" />
<link
  rel="icon"
  type="image/png"
  href="/branding/favicon-32.png"
  sizes="32x32"
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/renderer/index-html-branding.test.ts`
Expected: PASS

- [ ] **Step 5: Leave changes uncommitted for the final batch**

Do not commit yet; keep this work for the single final commit after verification.

### Task 2: Add deterministic icon generation script and tests

**Files:**

- Create: `scripts/generate-icons.mjs`
- Create: `tests/branding/generate-icons.test.ts`
- Create: `build-assets/logo/source.png`
- Create: `build-assets/logo/icon-16.png`
- Create: `build-assets/logo/icon-32.png`
- Create: `build-assets/logo/icon-48.png`
- Create: `build-assets/logo/icon-64.png`
- Create: `build-assets/logo/icon-128.png`
- Create: `build-assets/logo/icon-256.png`
- Create: `build-assets/logo/icon-512.png`
- Create: `build-assets/logo/favicon.ico`
- Create: `build-assets/logo/icon.ico`
- Create: `build-assets/logo/icon.icns`
- Create: `src/renderer/public/branding/favicon.ico`
- Create: `src/renderer/public/branding/favicon-32.png`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 0: Add the committed source image fixture**

Save the approved user-provided logo image at:

```text
build-assets/logo/source.png
```

This file must exist before the first generator test run so the intended initial failure is "missing implementation," not "missing fixture."

- [ ] **Step 1: Write the failing tests**

Create tests that exercise actual generation behavior in a temp workspace, verify copied favicon contents are regenerated from the source outputs, and also cover the missing-source failure path.

This task uses the provided raster as-is; do not redraw or vectorize the logo.

```ts
import { describe, it, expect } from "vitest";
import {
  mkdtempSync,
  existsSync,
  mkdirSync,
  cpSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateIcons } from "../../scripts/generate-icons.mjs";

const here = dirname(fileURLToPath(import.meta.url));

describe("generate-icons", () => {
  it("writes all required icon outputs from source.png", async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "logo-gen-"));
    mkdirSync(join(fixtureRoot, "build-assets/logo"), { recursive: true });
    mkdirSync(join(fixtureRoot, "src/renderer/public/branding"), {
      recursive: true,
    });
    cpSync(
      resolve(here, "../../build-assets/logo/source.png"),
      join(fixtureRoot, "build-assets/logo/source.png"),
    );

    await generateIcons({ rootDir: fixtureRoot });

    expect(existsSync(join(fixtureRoot, "build-assets/logo/icon-16.png"))).toBe(
      true,
    );
    expect(existsSync(join(fixtureRoot, "build-assets/logo/icon-32.png"))).toBe(
      true,
    );
    expect(existsSync(join(fixtureRoot, "build-assets/logo/icon-48.png"))).toBe(
      true,
    );
    expect(existsSync(join(fixtureRoot, "build-assets/logo/icon-64.png"))).toBe(
      true,
    );
    expect(
      existsSync(join(fixtureRoot, "build-assets/logo/icon-128.png")),
    ).toBe(true);
    expect(
      existsSync(join(fixtureRoot, "build-assets/logo/icon-256.png")),
    ).toBe(true);
    expect(
      existsSync(join(fixtureRoot, "build-assets/logo/icon-512.png")),
    ).toBe(true);
    expect(existsSync(join(fixtureRoot, "build-assets/logo/icon.ico"))).toBe(
      true,
    );
    expect(existsSync(join(fixtureRoot, "build-assets/logo/icon.icns"))).toBe(
      true,
    );
    expect(existsSync(join(fixtureRoot, "build-assets/logo/favicon.ico"))).toBe(
      true,
    );
    expect(
      existsSync(join(fixtureRoot, "src/renderer/public/branding/favicon.ico")),
    ).toBe(true);
    expect(
      existsSync(
        join(fixtureRoot, "src/renderer/public/branding/favicon-32.png"),
      ),
    ).toBe(true);
    expect(
      readFileSync(
        join(fixtureRoot, "src/renderer/public/branding/favicon.ico"),
      ),
    ).toEqual(readFileSync(join(fixtureRoot, "build-assets/logo/favicon.ico")));
    expect(
      readFileSync(
        join(fixtureRoot, "src/renderer/public/branding/favicon-32.png"),
      ),
    ).toEqual(readFileSync(join(fixtureRoot, "build-assets/logo/icon-32.png")));
    expect(
      readFileSync(join(fixtureRoot, "build-assets/logo/icon-32.png")),
    ).not.toEqual(
      readFileSync(join(fixtureRoot, "build-assets/logo/source.png")),
    );
  });

  it("throws when source.png is missing", async () => {
    const emptyRoot = mkdtempSync(join(tmpdir(), "logo-gen-missing-"));

    await expect(generateIcons({ rootDir: emptyRoot })).rejects.toThrow(
      "build-assets/logo/source.png",
    );
  });

  it("overwrites stale derived files on repeated runs", async () => {
    const rerunRoot = mkdtempSync(join(tmpdir(), "logo-gen-rerun-"));
    mkdirSync(join(rerunRoot, "build-assets/logo"), { recursive: true });
    mkdirSync(join(rerunRoot, "src/renderer/public/branding"), {
      recursive: true,
    });
    cpSync(
      resolve(here, "../../build-assets/logo/source.png"),
      join(rerunRoot, "build-assets/logo/source.png"),
    );

    await generateIcons({ rootDir: rerunRoot });
    cpSync(
      join(rerunRoot, "build-assets/logo/icon-32.png"),
      join(rerunRoot, "build-assets/logo/icon-32-before.png"),
    );
    cpSync(
      join(rerunRoot, "build-assets/logo/favicon.ico"),
      join(rerunRoot, "build-assets/logo/favicon-before.ico"),
    );
    cpSync(
      resolve(here, "../../package.json"),
      join(rerunRoot, "src/renderer/public/branding/favicon-32.png"),
    );

    await generateIcons({ rootDir: rerunRoot });

    expect(
      readFileSync(join(rerunRoot, "build-assets/logo/icon-32.png")),
    ).toEqual(
      readFileSync(join(rerunRoot, "build-assets/logo/icon-32-before.png")),
    );
    expect(
      readFileSync(join(rerunRoot, "build-assets/logo/favicon.ico")),
    ).toEqual(
      readFileSync(join(rerunRoot, "build-assets/logo/favicon-before.ico")),
    );
    expect(
      readFileSync(
        join(rerunRoot, "src/renderer/public/branding/favicon-32.png"),
      ),
    ).toEqual(readFileSync(join(rerunRoot, "build-assets/logo/icon-32.png")));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/branding/generate-icons.test.ts`
Expected: FAIL because the generator module and output behavior do not yet exist.

- [ ] **Step 3: Write minimal implementation**

Implement `scripts/generate-icons.mjs` with a callable API plus CLI entrypoint:

```js
export async function generateIcons({ rootDir = process.cwd() } = {}) {
  // resolve source and output paths from rootDir
  // throw if build-assets/logo/source.png is missing
  // invoke the chosen OSS generator
  // write PNG / ICO / ICNS outputs
  // write build-assets/logo/favicon.ico
  // copy favicon assets into src/renderer/public/branding/
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await generateIcons();
}
```

Then extend the script to:

- read `build-assets/logo/source.png`
- normalize the logo before export by centering it on a square canvas with consistent padding while preserving the original black-background / white-mark treatment
- call the chosen OSS icon generator
- write the required PNG / ICO / ICNS files
- write `build-assets/logo/favicon.ico`
- copy favicon files into `src/renderer/public/branding/`

Finally, update `package.json` to:

```json
{
  "scripts": {
    "generate:icons": "node scripts/generate-icons.mjs"
  },
  "devDependencies": {
    "icon-gen": "<resolved-version>"
  }
}
```

and commit the generated outputs.

- [ ] **Step 3.5: Install the generator dependency**

Run: `npm install --save-dev icon-gen`
Expected: PASS and `package.json` plus `package-lock.json` include the new generator dependency.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/branding/generate-icons.test.ts`
Expected: PASS

- [ ] **Step 5: Run the generator and verify outputs exist**

Run: `npm run generate:icons`
Expected: the script completes without error and writes all required icon and favicon outputs.

- [ ] **Step 6: Leave changes uncommitted for the final batch**

Do not commit yet; keep this work for the single final commit after verification.

### Task 3: Wire `electron-builder` to the generated logo assets

**Files:**

- Create: `tests/branding/package-builder-branding.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Write the failing test**

Create `tests/branding/package-builder-branding.test.ts` with a test that reads `package.json` and asserts the icon configuration points at the generated files.

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("package builder branding config", () => {
  it("points electron-builder to generated icon assets", () => {
    const pkg = JSON.parse(
      readFileSync(resolve(here, "../../package.json"), "utf8"),
    );

    expect(pkg.scripts["generate:icons"]).toBe(
      "node scripts/generate-icons.mjs",
    );
    expect(pkg.build.directories.buildResources).toBe("build-assets");
    expect(pkg.build.mac.icon).toBe("build-assets/logo/icon.icns");
    expect(pkg.build.win.icon).toBe("build-assets/logo/icon.ico");
    expect(pkg.build.linux.icon).toBe("build-assets/logo/icon-512.png");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/branding/package-builder-branding.test.ts`
Expected: FAIL because the `build` block is not yet present.

- [ ] **Step 3: Write minimal implementation**

Update `package.json` with an explicit `build` block:

```json
{
  "build": {
    "directories": {
      "buildResources": "build-assets"
    },
    "mac": {
      "icon": "build-assets/logo/icon.icns"
    },
    "win": {
      "icon": "build-assets/logo/icon.ico"
    },
    "linux": {
      "icon": "build-assets/logo/icon-512.png"
    }
  }
}
```

Do not change `name`, `version`, or package identity beyond what is required for icon wiring.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/branding/package-builder-branding.test.ts`
Expected: PASS

- [ ] **Step 5: Leave changes uncommitted for the final batch**

Do not commit yet; keep this work for the single final commit after verification.

### Task 4: Verify the full branding integration

**Files:**

- No new source files required

- [ ] **Step 1: Run focused tests**

Run:

```bash
npx vitest run tests/renderer/index-html-branding.test.ts tests/branding/generate-icons.test.ts tests/branding/package-builder-branding.test.ts
```

Expected: PASS

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Run the app build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Run packaging verification**

Run: `npm run build:unpack`
Expected: PASS and `electron-builder` resolves all icon paths successfully.

- [ ] **Step 5: Inspect final outputs**

Confirm these files exist:

```text
build-assets/logo/favicon.ico
build-assets/logo/icon.ico
build-assets/logo/icon.icns
build-assets/logo/icon-512.png
src/renderer/public/branding/favicon.ico
src/renderer/public/branding/favicon-32.png
```

- [ ] **Step 6: Commit the finished integration**

```bash
git add tests/renderer/index-html-branding.test.ts tests/branding/generate-icons.test.ts tests/branding/package-builder-branding.test.ts src/renderer/index.html src/renderer/public/branding package.json package-lock.json scripts/generate-icons.mjs build-assets/logo
git commit -m "feat: add app logo assets"
```

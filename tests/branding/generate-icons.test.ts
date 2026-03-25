import { describe, expect, it, vi } from "vitest";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

async function loadGenerateIcons() {
  const moduleId = `../../scripts/generate-icons.mjs?ts=${Date.now()}-${Math.random()}`;
  const module = await import(moduleId);

  return module;
}

function createSolidPngBuffer({ size, rgb }) {
  const png = new PNG({ width: size, height: size });

  for (let index = 0; index < png.data.length; index += 4) {
    png.data[index] = rgb[0];
    png.data[index + 1] = rgb[1];
    png.data[index + 2] = rgb[2];
    png.data[index + 3] = 255;
  }

  return PNG.sync.write(png);
}

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

    const { generateIcons } = await loadGenerateIcons();

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

    const icon32 = PNG.sync.read(
      readFileSync(join(fixtureRoot, "build-assets/logo/icon-32.png")),
    );

    expect(icon32.width).toBe(32);
    expect(icon32.height).toBe(32);
    expect(Array.from(icon32.data.slice(0, 4))).toEqual([0, 0, 0, 255]);
  });

  it("throws when source.png is missing", async () => {
    const emptyRoot = mkdtempSync(join(tmpdir(), "logo-gen-missing-"));
    const { generateIcons } = await loadGenerateIcons();

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

    const { generateIcons } = await loadGenerateIcons();

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

  it("removes obsolete generated files on successful reruns", async () => {
    const rerunRoot = mkdtempSync(join(tmpdir(), "logo-gen-cleanup-"));
    mkdirSync(join(rerunRoot, "build-assets/logo"), { recursive: true });
    mkdirSync(join(rerunRoot, "src/renderer/public/branding"), {
      recursive: true,
    });
    cpSync(
      resolve(here, "../../build-assets/logo/source.png"),
      join(rerunRoot, "build-assets/logo/source.png"),
    );

    const { generateIcons } = await loadGenerateIcons();

    await generateIcons({ rootDir: rerunRoot });
    writeFileSync(
      join(rerunRoot, "build-assets/logo/favicon-32.png"),
      createSolidPngBuffer({ size: 32, rgb: [0, 255, 0] }),
    );

    expect(
      existsSync(join(rerunRoot, "build-assets/logo/favicon-32.png")),
    ).toBe(true);

    await generateIcons({ rootDir: rerunRoot });

    expect(
      existsSync(join(rerunRoot, "build-assets/logo/favicon-32.png")),
    ).toBe(false);
  });

  it("keeps previously generated assets when a rerun fails", async () => {
    const rerunRoot = mkdtempSync(join(tmpdir(), "logo-gen-failed-rerun-"));
    mkdirSync(join(rerunRoot, "build-assets/logo"), { recursive: true });
    mkdirSync(join(rerunRoot, "src/renderer/public/branding"), {
      recursive: true,
    });
    cpSync(
      resolve(here, "../../build-assets/logo/source.png"),
      join(rerunRoot, "build-assets/logo/source.png"),
    );

    const { generateIcons } = await loadGenerateIcons();
    await generateIcons({ rootDir: rerunRoot });

    const previousIcon = readFileSync(
      join(rerunRoot, "build-assets/logo/icon-32.png"),
    );
    const previousFavicon = readFileSync(
      join(rerunRoot, "src/renderer/public/branding/favicon-32.png"),
    );

    writeFileSync(
      join(rerunRoot, "build-assets/logo/source.png"),
      createSolidPngBuffer({ size: 32, rgb: [255, 0, 0] }),
    );

    vi.resetModules();
    vi.doMock("icon-gen", async () => {
      const actual =
        await vi.importActual<typeof import("icon-gen")>("icon-gen");

      return {
        ...actual,
        default: vi.fn(async () => {
          throw new Error("simulated generation failure");
        }),
      };
    });

    const { generateIcons: failingGenerateIcons } = await loadGenerateIcons();

    await expect(failingGenerateIcons({ rootDir: rerunRoot })).rejects.toThrow(
      "simulated generation failure",
    );

    expect(
      readFileSync(join(rerunRoot, "build-assets/logo/icon-32.png")),
    ).toEqual(previousIcon);
    expect(
      readFileSync(
        join(rerunRoot, "src/renderer/public/branding/favicon-32.png"),
      ),
    ).toEqual(previousFavicon);

    vi.doUnmock("icon-gen");
    vi.resetModules();
  });

  it("detects direct cli execution by resolved file path", async () => {
    const { isDirectCliExecution } = await loadGenerateIcons();

    expect(
      isDirectCliExecution({
        moduleFilePath: "/repo/scripts/generate-icons.mjs",
        argvEntry: "/repo/scripts/generate-icons.mjs",
      }),
    ).toBe(true);

    expect(
      isDirectCliExecution({
        moduleFilePath: "/repo/scripts/generate-icons.mjs",
        argvEntry: "./scripts/generate-icons.mjs",
        cwd: "/repo",
      }),
    ).toBe(true);

    expect(
      isDirectCliExecution({
        moduleFilePath: "/repo/scripts/generate-icons.mjs",
        argvEntry: "/repo/scripts/other-script.mjs",
      }),
    ).toBe(false);

    expect(
      isDirectCliExecution({
        moduleFilePath: "/repo/scripts/generate-icons.mjs",
      }),
    ).toBe(false);
  });
});

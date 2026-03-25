import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("package builder branding", () => {
  it("wires generated icon assets into electron-builder config", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(here, "../../package.json"), "utf8"),
    );

    expect(packageJson.scripts["generate:icons"]).toBe(
      "node scripts/generate-icons.mjs",
    );
    expect(packageJson.scripts.prebuild).toBe("npm run generate:icons");
    expect(packageJson.build?.directories?.buildResources).toBe("build-assets");
    expect(packageJson.build?.mac?.icon).toBe("build-assets/logo/icon.icns");
    expect(packageJson.build?.win?.icon).toBe("build-assets/logo/icon.ico");
    expect(packageJson.build?.linux?.icon).toBe(
      "build-assets/logo/icon-512.png",
    );
  });
});

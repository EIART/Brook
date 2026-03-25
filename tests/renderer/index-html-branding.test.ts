import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
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

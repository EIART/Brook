import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import iconGen from "icon-gen";
import sharp from "sharp";

const REQUIRED_ICON_SIZES = [16, 32, 48, 64, 128, 256, 512];
const ICON_GEN_PNG_SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
const PADDING_RATIO = 0.125;
const OUTPUT_FILES = [
  ...REQUIRED_ICON_SIZES.map((size) => `icon-${size}.png`),
  "icon.ico",
  "icon.icns",
  "favicon.ico",
];
const BRANDING_FILES = ["favicon.ico", "favicon-32.png"];
const OUTPUT_FILES_TO_REMOVE = [...OUTPUT_FILES, "favicon-32.png"];
const BRANDING_FILES_TO_REMOVE = [...BRANDING_FILES];

async function buildNormalizedBase(sourcePath) {
  const source = sharp(sourcePath).flatten({ background: "#000000" });
  const metadata = await source.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Unable to read image dimensions from ${sourcePath}`);
  }

  const baseSize = 1024;
  const padding = Math.round(baseSize * PADDING_RATIO);
  const innerSize = baseSize - padding * 2;

  return source
    .resize({
      width: innerSize,
      height: innerSize,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .png()
    .toBuffer();
}

async function writeNormalizedPngs(baseBuffer, pngDirectory, outputDirectory) {
  for (const size of ICON_GEN_PNG_SIZES) {
    const buffer = await sharp(baseBuffer)
      .resize(size, size, { fit: "fill" })
      .png()
      .toBuffer();

    writeFileSync(join(pngDirectory, `${size}.png`), buffer);

    if (REQUIRED_ICON_SIZES.includes(size)) {
      writeFileSync(join(outputDirectory, `icon-${size}.png`), buffer);
    }
  }
}

function removeFiles(targetDirectory, fileNames) {
  for (const fileName of fileNames) {
    rmSync(join(targetDirectory, fileName), { force: true });
  }
}

function replaceFiles(sourceDirectory, targetDirectory, fileNames) {
  mkdirSync(targetDirectory, { recursive: true });

  for (const fileName of fileNames) {
    copyFileSync(
      join(sourceDirectory, fileName),
      join(targetDirectory, fileName),
    );
  }
}

export function isDirectCliExecution({
  moduleFilePath,
  argvEntry,
  cwd = process.cwd(),
} = {}) {
  if (!moduleFilePath || !argvEntry) {
    return false;
  }

  return resolve(moduleFilePath) === resolve(cwd, argvEntry);
}

export async function generateIcons({ rootDir = process.cwd() } = {}) {
  const resolvedRoot = resolve(rootDir);
  const outputDirectory = join(resolvedRoot, "build-assets/logo");
  const brandingDirectory = join(resolvedRoot, "src/renderer/public/branding");
  const sourcePath = join(outputDirectory, "source.png");

  if (!existsSync(sourcePath)) {
    throw new Error(`Missing required source image: ${sourcePath}`);
  }

  mkdirSync(outputDirectory, { recursive: true });
  mkdirSync(brandingDirectory, { recursive: true });

  const baseBuffer = await buildNormalizedBase(sourcePath);
  const workDirectory = mkdtempSync(join(tmpdir(), "generate-icons-"));
  const stagedOutputDirectory = join(workDirectory, "build-assets-logo");
  const stagedBrandingDirectory = join(workDirectory, "branding");
  const pngDirectory = join(workDirectory, "png-sources");

  try {
    mkdirSync(stagedOutputDirectory, { recursive: true });
    mkdirSync(stagedBrandingDirectory, { recursive: true });
    mkdirSync(pngDirectory, { recursive: true });

    await writeNormalizedPngs(baseBuffer, pngDirectory, stagedOutputDirectory);

    await iconGen(pngDirectory, stagedOutputDirectory, {
      report: false,
      ico: {
        name: "icon",
        sizes: [16, 24, 32, 48, 64, 128, 256],
      },
      icns: {
        name: "icon",
        sizes: [16, 32, 64, 128, 256, 512, 1024],
      },
      favicon: {
        name: "favicon-",
        pngSizes: [32],
        icoSizes: [16, 24, 32, 48, 64],
      },
    });

    copyFileSync(
      join(stagedOutputDirectory, "favicon.ico"),
      join(stagedBrandingDirectory, "favicon.ico"),
    );
    copyFileSync(
      join(stagedOutputDirectory, "icon-32.png"),
      join(stagedBrandingDirectory, "favicon-32.png"),
    );

    rmSync(join(stagedOutputDirectory, "favicon-32.png"), { force: true });

    removeFiles(outputDirectory, OUTPUT_FILES_TO_REMOVE);
    removeFiles(brandingDirectory, BRANDING_FILES_TO_REMOVE);
    replaceFiles(stagedOutputDirectory, outputDirectory, OUTPUT_FILES);
    replaceFiles(stagedBrandingDirectory, brandingDirectory, BRANDING_FILES);
  } finally {
    rmSync(workDirectory, { recursive: true, force: true });
  }
}

if (
  isDirectCliExecution({
    moduleFilePath: fileURLToPath(import.meta.url),
    argvEntry: process.argv[1],
  })
) {
  await generateIcons();
}

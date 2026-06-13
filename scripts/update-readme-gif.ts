// Generate the README demo GIF through the real e2e content-bundle harness,
// upload it to Zipline, and replace the README image URL.

import {
  type ChildProcess,
  spawn,
  spawnSync,
} from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import {
  STARTUP_MS,
  selectWord,
  setupBundleHarness,
} from '../tests/e2e/bundleHarness';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const sampleUrl = 'http://127.0.0.1:5199/sample.html';
const size = { width: 960, height: 620 };
const outputDir = resolve(root, '.output/readme-gif');
const videoDir = resolve(outputDir, 'video');
const gifPath = resolve(
  outputDir,
  'meow-memorizing-demo.gif',
);
const uploadBase =
  process.env.ZIPLINE_URL ?? 'https://upload.cryptorust.uk';

async function main(): Promise<void> {
  assertBuildArtifacts();
  assertCommand('ffmpeg');

  const token = process.env.ZIPLINE_TOKEN;
  if (!token) {
    throw new Error(
      'ZIPLINE_TOKEN is required to upload the README GIF.',
    );
  }

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(videoDir, { recursive: true });

  const server = await ensureServer();
  const browser = await launchBrowser();

  try {
    const webmPath = await recordDemo(browser);
    runChecked('ffmpeg', [
      '-y',
      '-i',
      webmPath,
      '-vf',
      [
        'fps=12',
        `scale=${size.width}:-1:flags=lanczos`,
        'split[s0][s1]',
        '[s0]palettegen=max_colors=96[p]',
        '[s1][p]paletteuse=dither=bayer:bayer_scale=5',
      ].join(','),
      '-loop',
      '0',
      gifPath,
    ]);

    const url = await uploadGif(token);
    updateReadme(url);
    console.log(`README GIF updated: ${url}`);
  } finally {
    await browser.close();
    server?.kill('SIGTERM');
  }
}

function assertBuildArtifacts(): void {
  const required = [
    '.output/chrome-mv3/content-scripts/trans.js',
    'src/wasm/generated/matcher.js',
  ];

  for (const path of required) {
    if (!existsSync(resolve(root, path))) {
      throw new Error(
        `Missing ${path}; run "bun run build" before generating the README GIF.`,
      );
    }
  }
}

function assertCommand(command: string): void {
  const result = spawnSync(command, ['-version'], {
    cwd: root,
    stdio: 'ignore',
  });

  if (result.status !== 0) {
    throw new Error(`${command} is required.`);
  }
}

async function ensureServer(): Promise<ChildProcess | null> {
  if (await isServerReady()) return null;

  const server = spawn(
    'bun',
    ['run', 'tests/e2e/server.ts'],
    {
      cwd: root,
      stdio: 'ignore',
    },
  );

  for (let i = 0; i < 60; i++) {
    if (await isServerReady()) return server;
    await delay(250);
  }

  server.kill('SIGTERM');
  throw new Error('Timed out waiting for the e2e server.');
}

async function isServerReady(): Promise<boolean> {
  try {
    const res = await fetch(sampleUrl, {
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function launchBrowser() {
  const executablePath =
    process.env.PLAYWRIGHT_CHROME ?? undefined;

  return chromium.launch({
    executablePath,
    args: ['--no-sandbox'],
  });
}

async function recordDemo(
  browser: Awaited<ReturnType<typeof launchBrowser>>,
): Promise<string> {
  const h = await setupBundleHarness(browser, {
    url: sampleUrl,
    viewport: size,
    recordVideo: { dir: videoDir, size },
    seedWords: {
      browser: word('browser'),
      extension: word('extension'),
      vocabulary: word('vocabulary'),
    },
  });
  const video = h.page.video();

  await h.page.evaluate(() => {
    document.body.innerHTML = `
      <main class="readme-demo-shell">
        <section class="readme-demo-card">
          <p class="eyebrow">Meow Memorizing</p>
          <h1>Browser extension vocabulary helper</h1>
          <p>
            Save vocabulary from any article and the extension highlights
            every repeated word while you keep reading.
          </p>
          <p id="selection-target">
            Select serendipity once to add it, then revisit the page with
            the word already highlighted.
          </p>
        </section>
      </main>
    `;

    const style = document.createElement('style');
    style.textContent = `
      body {
        margin: 0;
        min-height: 100vh;
        background: #f5f7fb;
        color: #1f2937;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system,
          BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .readme-demo-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 48px;
        box-sizing: border-box;
      }
      .readme-demo-card {
        width: min(760px, 100%);
        background: #ffffff;
        border: 1px solid #d8dee9;
        border-radius: 8px;
        box-shadow: 0 18px 50px rgb(31 41 55 / 14%);
        padding: 42px;
      }
      .readme-demo-card .eyebrow {
        margin: 0 0 12px;
        color: #0f766e;
        font-size: 15px;
        font-weight: 700;
      }
      .readme-demo-card h1 {
        margin: 0 0 20px;
        color: #111827;
        font-size: 42px;
        line-height: 1.12;
      }
      .readme-demo-card p {
        margin: 0 0 18px;
        font-size: 22px;
        line-height: 1.55;
      }
      #selection-target {
        margin-top: 26px;
        padding-top: 22px;
        border-top: 1px solid #e5e7eb;
      }
    `;
    document.head.appendChild(style);
  });

  await h.page.waitForTimeout(STARTUP_MS);
  await h.page
    .locator('[data-word="extension"]')
    .first()
    .waitFor({ timeout: 15000 });
  await h.page.waitForTimeout(700);
  await selectWord(
    h.page,
    '#selection-target',
    'serendipity',
  );
  await h.page
    .locator('[data-meow-tooltip-root="selection"]')
    .waitFor({ timeout: 15000 });
  await h.page.waitForTimeout(1800);

  await h.close();

  const path = await video?.path();
  if (!path) {
    throw new Error('Playwright did not produce a video.');
  }

  return path;
}

function word(wordText: string) {
  return {
    word: wordText,
    isDeleted: false,
    queryTimes: 1,
    deleteTimes: 0,
  };
}

function runChecked(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(
      `Command failed: ${command} ${args.join(' ')}`,
    );
  }
}

async function uploadGif(token: string): Promise<string> {
  const form = new FormData();
  const bytes = new Uint8Array(readFileSync(gifPath));
  const file = new Blob([bytes], { type: 'image/gif' });

  form.append('file', file, 'meow-memorizing-demo.gif');

  const res = await fetch(`${uploadBase}/api/upload`, {
    method: 'POST',
    headers: {
      authorization: token,
      'x-zipline-no-json': 'true',
      'x-zipline-original-name': 'true',
    },
    body: form,
  });
  const body = await res.text();

  if (!res.ok) {
    throw new Error(
      `Zipline upload failed (${res.status}): ${body}`,
    );
  }

  const url = parseUploadUrl(body);
  if (!url) {
    throw new Error(
      `Zipline upload response did not contain a URL: ${body}`,
    );
  }

  return url;
}

function parseUploadUrl(body: string): string | null {
  const textUrl = body
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('http'));
  if (textUrl) return textUrl;

  try {
    const json = JSON.parse(body) as {
      files?: { url?: string }[];
    };
    return (
      json.files?.find((file) => file.url)?.url ?? null
    );
  } catch {
    return null;
  }
}

function updateReadme(url: string): void {
  const readme = resolve(root, 'README.md');
  const current = readFileSync(readme, 'utf8');
  const next = current.replace(
    /!\[example\.gif\]\([^)]+\)/,
    `![example.gif](${url})`,
  );

  if (next === current) {
    throw new Error(
      'README example.gif image link not found.',
    );
  }

  writeFileSync(readme, next);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}

await main();

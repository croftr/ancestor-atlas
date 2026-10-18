// A small Chrome DevTools Protocol client for filming the app: launch Chrome, open a page, run scripts in it,
// and record what it draws (Chrome's screencast: a JPEG per drawn frame, with its time). No dependencies:
// Node's own fetch and WebSocket.
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9333;

export interface Page {
  send<T = unknown>(method: string, params?: object): Promise<T>;
  on(method: string, fn: (params: any) => void): void;
  /** Run an expression (or an async function body's result) in the page and return its value. */
  eval<T = unknown>(expression: string): Promise<T>;
  close(): Promise<void>;
}

export async function launch(opts: { width: number; height: number; headless?: boolean; profile: string }): Promise<Page> {
  // A fresh profile each time (the last Chrome may still be letting go of its files).
  const profile = resolve(`${opts.profile}-${Date.now()}`);
  mkdirSync(profile, { recursive: true });
  const chrome: ChildProcess = spawn(
    CHROME,
    [
      ...(opts.headless === false ? [] : ["--headless=new"]),
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      `--window-size=${opts.width},${opts.height}`,
      "--hide-scrollbars",
      "--mute-audio",
      "--autoplay-policy=no-user-gesture-required",
      "--no-first-run",
      "--no-default-browser-check",
      "--enable-gpu",
      "--ignore-gpu-blocklist",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let target: { webSocketDebuggerUrl: string } | undefined;
  for (let i = 0; i < 300 && !target; i++) {
    await new Promise((r) => setTimeout(r, 100));
    try {
      const list = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
      target = list.find((t) => t.type === "page");
    } catch {
      // not up yet
    }
  }
  if (!target) throw new Error("Chrome did not start");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  let id = 0;
  const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  const listeners = new Map<string, ((p: any) => void)[]>();
  ws.onmessage = (m) => {
    const msg = JSON.parse(String(m.data));
    if (msg.id !== undefined) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p?.reject(new Error(`${msg.error.message} ${msg.error.data ?? ""}`));
      else p?.resolve(msg.result);
    } else for (const fn of listeners.get(msg.method) ?? []) fn(msg.params);
  };
  const page: Page = {
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        pending.set(++id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      }),
    on: (method, fn) => listeners.set(method, [...(listeners.get(method) ?? []), fn]),
    eval: async (expression) => {
      const r = await page.send<{ result: { value: any }; exceptionDetails?: { exception?: { description?: string }; text: string } }>(
        "Runtime.evaluate",
        { expression, awaitPromise: true, returnByValue: true },
      );
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    close: async () => {
      ws.close();
      const exited = new Promise((r) => chrome.once("exit", r));
      chrome.kill();
      await exited;
      await new Promise((r) => setTimeout(r, 500));
      try {
        rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch {
        // left for the next clean-up of data/build
      }
    },
  };
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Emulation.setDeviceMetricsOverride", { width: opts.width, height: opts.height, deviceScaleFactor: 1, mobile: false });
  return page;
}

/** Record the page's frames until `stop` is called; returns the frames' files and times (seconds from the start). */
export function record(page: Page, dir: string, quality = 92) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const frames: { file: string; t: number }[] = [];
  let t0: number | undefined;
  let on = true;
  page.on("Page.screencastFrame", (p: { data: string; sessionId: number; metadata: { timestamp: number } }) => {
    page.send("Page.screencastFrameAck", { sessionId: p.sessionId });
    if (!on) return;
    t0 ??= p.metadata.timestamp;
    const file = `${dir}/${String(frames.length).padStart(5, "0")}.jpg`;
    writeFileSync(file, Buffer.from(p.data, "base64"));
    frames.push({ file, t: p.metadata.timestamp - t0 });
  });
  const started = page.send("Page.startScreencast", { format: "jpeg", quality, everyNthFrame: 1 });
  return {
    started,
    async stop() {
      on = false;
      await page.send("Page.stopScreencast");
      return frames;
    },
  };
}

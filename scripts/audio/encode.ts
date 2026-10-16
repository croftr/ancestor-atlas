// Shared by the audio scripts: loudness-normalise and encode to MP3 for the media bucket.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

export const BUCKET = "robs-ancestors-atlas";
export const REGION = "eu-west-2";
/** The bucket's public URL (as MEDIA_BASE in src/config.ts). */
export const MEDIA_BASE_DEFAULT = "https://robs-ancestors-atlas.s3.eu-west-2.amazonaws.com";

/**
 * Two-pass loudnorm to -16 LUFS (peaks under -1.5 dBTP): measure, then correct linearly (one pass
 * undershoots on short clips). Narration and music share the level; tours set the mix in the app.
 */
export function encode(input: string, out: string, opts: { channels: 1 | 2; kbps: number }): number {
  mkdirSync(out.slice(0, out.lastIndexOf("/")), { recursive: true });
  const LOUDNORM = "loudnorm=I=-16:TP=-1.5:LRA=11";
  const probe = spawnSync("ffmpeg", ["-hide_banner", "-i", input, "-vn", "-af", `${LOUDNORM}:print_format=json`, "-f", "null", "-"], {
    encoding: "utf8",
  });
  const json = probe.stderr.match(/\{[^{}]*"input_i"[^{}]*\}/)?.[0];
  if (probe.status !== 0 || !json) {
    console.error(`✗ could not measure ${input}:\n${probe.stderr.slice(-500)}`);
    process.exit(1);
  }
  const m = JSON.parse(json);
  const filter = `${LOUDNORM}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  execFileSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-y", "-i", input, "-map_metadata", "-1", "-vn",
      "-af", filter, "-ac", String(opts.channels), "-ar", "44100", "-c:a", "libmp3lame", "-b:a", `${opts.kbps}k`, out],
    { stdio: "inherit" },
  );
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], { encoding: "utf8" }));
}

/** `aws` arguments to upload a clip: a year-long cache, so a key is never reused. */
export const uploadArgs = (out: string, key: string) => [
  "s3", "cp", out, `s3://${BUCKET}/${key}`, "--content-type", "audio/mpeg",
  "--cache-control", "public, max-age=31536000, immutable", "--region", REGION, "--only-show-errors",
];
export const uploadCommand = (out: string, key: string) =>
  `aws s3 cp ${out} s3://${BUCKET}/${key} --content-type audio/mpeg --cache-control "public, max-age=31536000, immutable" --region ${REGION}`;

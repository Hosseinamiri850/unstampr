# Processing (worker + FFmpeg)

## Job lifecycle

```
UPLOADING → ANALYZING → DETECTING → PROCESSING → ENCODING → COMPLETED
                                                       ↘ FAILED
                                                       ↘ CANCELLED (via Redis flag)
```

Every transition writes `progress` (0–100); the human-readable stage label is rendered client-side
from the `stages` namespace in `messages/{locale}.json` (en, fa, es, zh, hi), never hardcoded in the
worker.

## remove-ai-watermarks use

Visible-path only (CPU-friendly, no CUDA):

- Image: `raiw.remove_visible(in, out)` → `(result, removed)`
- Video: `raiw.remove_video_visible(in, out, mark="hailuo"|"veo"|...)` → object with `.mark`
- AoT fallback: `raiw.remove_video_all(in, out)` when provider mark unknown → passthrough copy.
- Detection: `raiw.identify_video` / `raiw.identify`, coerced to `{provider, confidence, location}`
  by `worker/app/watermark._normalize_identify`.

Supported visible marks (from the upstream README): Sora, Veo, Seedance, Dola, Hailuo, Kling.

The **invisible** path (`raiw.remove_invisible`, `qwen-zimage`) requires an NVIDIA GPU and is
intentionally not wired into the MVP worker.

## FFmpeg

All invocations use `subprocess.run([FFMPEG, ...args])` — **never** `shell=True`, and arguments
are local temp paths only (never user-supplied strings). Outputs set `+faststart` for web playback.

Memory: videos are processed via the library's streaming path (frame-wise); the worker downloads
to a `tempfile.TemporaryDirectory()` that is removed on exit. We do not load whole videos into RAM.

## Configurable limits

`MAX_IMAGE_SIZE`, `MAX_VIDEO_SIZE`, `MAX_VIDEO_DURATION` (all env, no hardcoding). The worker
rejects videos exceeding the duration limit with `INVALID_VIDEO`.

## File retention + cleanup

Object keys (`uploads/`, `outputs/`) carry `expires_at` on the `files` row, written at upload and
output time with `FILE_RETENTION_HOURS` (default 24).

Cleanup is **built into the worker loop** — no external cron needed. On every
`RECOVERY_INTERVAL_SECONDS` (default 60) tick, `worker/main.py` runs:

1. `reliability.dispatch_outbox(...)` — re-delivers jobs whose outbox row never reached Redis.
2. `recovery_pass(...)` — heals lost messages and re-queues stale jobs (bounded by
   `MAX_JOB_ATTEMPTS`).
3. `retention_pass(settings)` (`worker/app/retention.py`) — deletes expired S3 objects and their
   `files` rows.

So a single worker process is enough to enforce retention; with multiple replicas the passes are
idempotent and simply repeat. Local temp media lives in a process-private `TemporaryDirectory()`
cleaned on exit.

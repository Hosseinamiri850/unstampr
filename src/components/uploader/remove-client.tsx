'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { UploadCloud, X, Image as ImageIcon, Film, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn, formatBytes } from '@/lib/utils';
import { easeOutSoft } from '@/components/motion/motion-primitives';

type LocalState = 'idle' | 'selected' | 'uploading';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp'];
const VIDEO_EXT = ['.mp4', '.mov', '.webm'];

export function RemoveClient({ maxImage, maxVideo }: { maxImage: number; maxVideo: number }) {
  const t = useTranslations('upload');
  const terr = useTranslations('errors');
  const locale = useLocale() as 'fa' | 'en';
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reduce = useReducedMotion();

  const [state, setState] = useState<LocalState>('idle');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>('');

  const isVideo = file?.type.startsWith('video/') ?? false;

  const validate = useCallback(
    (f: File): string => {
      const ext = '.' + (f.name.split('.').pop() ?? '').toLowerCase();
      const isImage = IMAGE_TYPES.includes(f.type) || IMAGE_EXT.includes(ext);
      const isVideo = VIDEO_TYPES.includes(f.type) || VIDEO_EXT.includes(ext);
      if (!isImage && !isVideo) return terr('UNSUPPORTED_FORMAT');
      if (isImage && f.size > maxImage) return terr('FILE_TOO_LARGE');
      if (isVideo && f.size > maxVideo) return terr('FILE_TOO_LARGE');
      return '';
    },
    [maxImage, maxVideo, terr],
  );

  const selectFile = useCallback(
    (f: File) => {
      const err = validate(f);
      if (err) {
        setError(err);
        return;
      }
      setError('');
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setState('selected');
    },
    [validate],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) selectFile(f);
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    abortRef.current?.abort();
    setFile(null);
    setPreviewUrl('');
    setProgress(0);
    setError('');
    setState('idle');
  };

  const startUpload = async () => {
    if (!file) return;
    setState('uploading');
    setProgress(5);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // 1. request signed upload URL
      const meta = {
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        kind: file.type.startsWith('image/') ? 'image' : 'video',
      };
      const init = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(meta),
        signal: controller.signal,
      });
      if (!init.ok) throw new Error('init failed');
      const { uploadUrl, jobId } = (await init.json()) as { uploadUrl: string; jobId: string };

      // 2. stream to storage with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.min(95, 5 + Math.round((e.loaded / e.total) * 90)));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('upload failed')));
        xhr.onerror = () => reject(new Error('upload failed'));
        xhr.send(file);
      });

      // 3. confirm -> job enqueued
      const confirmRes = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jobId }),
        signal: controller.signal,
      });
      if (!confirmRes.ok) {
        const body = (await confirmRes.json().catch(() => ({}))) as { error?: string };
        if (body.error === 'DAILY_QUOTA_EXCEEDED') throw new Error('DAILY_QUOTA_EXCEEDED');
        throw new Error('confirm failed');
      }

      setProgress(100);
      // navigate to processing status page
      router.push(`/dashboard?job=${jobId}`);
    } catch (e) {
      setError(e instanceof Error && e.message === 'DAILY_QUOTA_EXCEEDED' ? terr('DAILY_QUOTA_EXCEEDED') : terr('PROCESSING_FAILED'));
      setState('selected');
    }
  };

  const cancelUpload = () => {
    abortRef.current?.abort();
    reset();
  };

  const percent = locale === 'fa' ? progress.toLocaleString('fa-IR') : progress;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={t('idlePrompt')}
        onClick={() => state === 'idle' && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (state === 'idle' && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        animate={reduce ? undefined : { scale: dragging ? 1.01 : 1 }}
        transition={{ duration: 0.2, ease: easeOutSoft }}
        className={cn(
          'relative flex min-h-72 flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed bg-card p-6 text-center shadow-soft transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-8',
          state === 'idle' ? 'cursor-pointer' : 'cursor-default',
          dragging ? 'border-primary bg-brand-soft/50' : 'border-border hover:border-primary/45',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) selectFile(f);
            e.target.value = '';
          }}
        />

        {/* warm glow that intensifies while dragging */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent transition-opacity duration-300',
            dragging ? 'opacity-100' : 'opacity-0',
          )}
        />

        <AnimatePresence mode="wait" initial={false}>
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: easeOutSoft }}
              className="relative flex flex-col items-center gap-4"
            >
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {!reduce && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-2xl border border-primary/30"
                    animate={{ scale: [1, 1.18], opacity: [0.5, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
                <UploadCloud className={cn('h-7 w-7 transition-transform duration-300', dragging && 'scale-110')} />
              </span>
              <div className="space-y-1">
                <p className="text-base font-semibold">{dragging ? t('dragging') : t('idleTitle')}</p>
                <p className="text-sm text-muted-foreground">{t('idlePrompt')}</p>
                <p className="text-xs text-muted-foreground">{t('idlePrompt2')}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                {t('selectFile')}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t('supportedImages')} · {t('supportedVideos')}
              </p>
            </motion.div>
          )}

          {state !== 'idle' && file && (
            <motion.div
              key="file"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: easeOutSoft }}
              className="relative flex w-full flex-col gap-4"
            >
              <div className="flex items-center gap-4 text-start">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary shadow-soft">
                  {previewUrl && isVideo ? (
                    <video src={previewUrl} className="h-full w-full object-cover" muted />
                  ) : previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      {isVideo ? <Film className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{file.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatBytes(file.size, locale)} · {isVideo ? t('supportedVideos') : t('supportedImages')}
                  </p>
                </div>
                {state === 'selected' && (
                  <Button size="icon" variant="ghost" aria-label={t('removeFile')} onClick={reset}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {state === 'selected' && (
                <Button size="lg" onClick={startUpload} className="w-full shadow-soft">
                  {t('startProcess')}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              )}

              {state === 'uploading' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t('uploading')}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">{percent}%</span>
                  </div>
                  <Progress value={progress} />
                  <Button size="sm" variant="ghost" onClick={cancelUpload} className="w-full">
                    {t('cancelUpload')}
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            role="alert"
            key="error"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 flex items-center justify-center gap-2 text-center text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        {t('maxImage')}: {formatBytes(maxImage, locale)} · {t('maxVideo')}: {formatBytes(maxVideo, locale)}
      </p>
    </div>
  );
}

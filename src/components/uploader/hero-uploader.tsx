'use client';

import { useRef, useState, type DragEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { UploadCloud } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { easeOutSoft } from '@/components/motion/motion-primitives';

/**
 * Compact drop target for the hero: selecting a file hands the user straight to
 * the real workspace (the file itself cannot survive a route change, so the
 * workspace re-opens its picker).
 */
export function HeroUploader() {
  const t = useTranslations('upload');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const reduce = useReducedMotion();

  function onFiles(files: FileList | null) {
    if (files?.[0]) router.push('/remove');
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    onFiles(e.dataTransfer.files);
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={t('idlePrompt')}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
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
      animate={reduce ? undefined : { scale: dragging ? 1.015 : 1 }}
      transition={{ duration: 0.18, ease: easeOutSoft }}
      className={cn(
        'group flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/60 p-5 text-center shadow-soft backdrop-blur transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-row sm:gap-4 sm:text-start',
        dragging ? 'border-primary bg-brand-soft/60' : 'hover:border-primary/45 hover:bg-card',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300',
          dragging ? 'scale-110 bg-primary text-primary-foreground' : 'group-hover:bg-primary group-hover:text-primary-foreground',
        )}
      >
        <UploadCloud className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{dragging ? t('dragging') : t('idlePrompt')}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{t('idlePrompt2')}</span>
      </span>
      <Button asChild size="sm" variant="outline" className="shrink-0">
        <span>{t('selectFile')}</span>
      </Button>
    </motion.div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { X, Twitter, Twitch, Github, MessageCircle, Instagram, Linkedin, Mail, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react';

import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { fetchTwitterUserPreview, normalizeTwitterHandle, type TwitterUserPreview } from '../../utils/twitter';

import type { ZkSendPlatform } from './ZkSendPanel';

const TWITTER_PREVIEW_DEBOUNCE_MS = 500;

const PLATFORM_OPTIONS: {
  value: ZkSendPlatform;
  label: string;
  hint: string;
  icon: typeof Twitter;
  disabled?: boolean;
}[] = [
  { value: 'twitter', label: 'Twitter / X', hint: 'Send to handle', icon: Twitter },
  { value: 'twitch', label: 'Twitch', hint: 'Send to username', icon: Twitch },
  { value: 'github', label: 'GitHub', hint: 'Send to username', icon: Github },
  { value: 'telegram', label: 'Telegram', hint: 'Send to username', icon: MessageCircle },
  { value: 'instagram', label: 'Instagram', hint: 'Send to username', icon: Instagram, disabled: true },
  // { value: 'tiktok', label: 'TikTok', hint: 'Send to username', icon: Music2 },
  { value: 'gmail', label: 'Gmail', hint: 'Send to email', icon: Mail },
  { value: 'linkedin', label: 'LinkedIn', hint: 'Send to username', icon: Linkedin },
];

type Props = {
  platform: ZkSendPlatform;
  onPlatformChange: (platform: ZkSendPlatform) => void;
  username: string;
  onUsernameChange: (username: string) => void;
  label?: string;
  inputId?: string;
  ariaLabel?: string;
};

type PreviewStatus = 'idle' | 'loading' | 'success' | 'error';

export function PlatformUsernameInput({
  platform,
  onPlatformChange,
  username,
  onUsernameChange,
  label = 'To',
  inputId = 'platform-username-input',
  ariaLabel = 'Username',
}: Props) {
  const [platformPopoverOpen, setPlatformPopoverOpen] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle');
  const [previewData, setPreviewData] = useState<TwitterUserPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestRef = useRef<string>('');

  const currentPlatformOpt = PLATFORM_OPTIONS.find((o) => o.value === platform) ?? PLATFORM_OPTIONS[0];
  const normalizedUsername = normalizeTwitterHandle(username);
  const showTwitterPreview = platform === 'twitter';

  useEffect(() => {
    if (!showTwitterPreview || !normalizedUsername) {
      setPreviewStatus('idle');
      setPreviewData(null);
      setPreviewError(null);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPreviewStatus('loading');
    setPreviewError(null);

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const requested = normalizedUsername;
      lastRequestRef.current = requested;

      fetchTwitterUserPreview(requested).then((result) => {
        if (lastRequestRef.current !== requested) return;
        if (result.success) {
          setPreviewStatus('success');
          setPreviewData(result.data);
          setPreviewError(null);
        } else {
          setPreviewStatus('error');
          setPreviewData(null);
          setPreviewError(result.error);
        }
      });
    }, TWITTER_PREVIEW_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [showTwitterPreview, normalizedUsername]);

  const clearUsername = () => onUsernameChange('');

  return (
    <div className="space-y-2">
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}
      <div className="flex gap-0 items-center rounded-xl border bg-background ring-offset-background has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2 overflow-hidden">
        <div className="relative flex-1 min-w-0">
          <Input
            id={inputId}
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder="@username"
            aria-label={ariaLabel}
            className="border-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pr-10"
          />
          {username.length > 0 && (
            <button
              type="button"
              onClick={clearUsername}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Popover open={platformPopoverOpen} onOpenChange={setPlatformPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 shrink-0 h-9 pl-2 pr-2 py-1 border-input text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              aria-label="Choose platform"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted dark:bg-muted/80 text-foreground">
                {(() => {
                  const Icon = currentPlatformOpt.icon;
                  return <Icon className="h-4 w-4 shrink-0" />;
                })()}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${platformPopoverOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="end" sideOffset={4}>
            <div className="space-y-0.5">
              {PLATFORM_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isDisabled = opt.disabled;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isDisabled}
                    title={isDisabled ? 'Temporarily unavailable' : undefined}
                    onClick={() => {
                      if (isDisabled) return;
                      onPlatformChange(opt.value as ZkSendPlatform);
                      setPlatformPopoverOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${platform === opt.value ? 'bg-muted/40' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="font-medium">{opt.label}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {showTwitterPreview && normalizedUsername && (
        <>
          {previewStatus === 'loading' && (
            <div
              className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-2 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Twitter className="h-4 w-4 text-muted-foreground" />
              </span>
              <span>@{normalizedUsername}</span>
              <span>Searching…</span>
              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            </div>
          )}
          {previewStatus === 'success' && previewData && (
            <div
              className="flex items-center gap-2 rounded-full bg-sky-100 dark:bg-sky-900/30 px-3 py-2 text-sm"
              role="status"
            >
              {previewData.profile_image_url ? (
                <img
                  src={previewData.profile_image_url}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                  width={32}
                  height={32}
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Twitter className="h-4 w-4 text-muted-foreground" />
                </span>
              )}
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {previewData.name && previewData.name !== previewData.username && (
                  <span className="truncate text-foreground">{previewData.name}</span>
                )}
                <span className="shrink-0 font-medium text-foreground">@{previewData.username}</span>
              </div>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
            </div>
          )}
          {previewStatus === 'error' && previewError && (
            <p className="text-sm text-destructive" role="alert">
              {previewError}
            </p>
          )}
        </>
      )}
    </div>
  );
}

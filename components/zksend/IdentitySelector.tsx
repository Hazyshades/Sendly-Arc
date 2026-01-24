import { useMemo } from 'react';
import { CheckCircle2, Twitter, Twitch, Github, Instagram, Linkedin, Mail } from 'lucide-react';

import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent } from '../ui/card';
import { normalizeSocialUsername } from '../../utils/reclaim/identity';

import type { ZkSendPlatform } from './ZkSendPanel';

type Props = {
  platform: ZkSendPlatform;
  onPlatformChange: (platform: ZkSendPlatform) => void;
  username: string;
  onUsernameChange: (username: string) => void;
  isConnected?: boolean;
};

const platformIcons: Record<ZkSendPlatform, typeof Twitter> = {
  twitter: Twitter,
  twitch: Twitch,
  github: Github,
  instagram: Instagram,
  linkedin: Linkedin,
  tiktok: Instagram,
  gmail: Mail,
};

const platformLabels: Record<ZkSendPlatform, string> = {
  twitter: 'Twitter / X',
  twitch: 'Twitch',
  github: 'GitHub',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  gmail: 'Gmail',
};

export function IdentitySelector({ platform, onPlatformChange, username, onUsernameChange, isConnected }: Props) {
  const normalizedUsername = useMemo(() => normalizeSocialUsername(username.replace(/^@/, '')), [username]);
  const isValid = !!normalizedUsername;
  const PlatformIcon = platformIcons[platform];

  return (
    <Card className="border-2">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-sm font-medium text-muted-foreground">Identity for all operations</div>
            {isConnected && isValid && (
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Connected</span>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="platform-select">Platform</Label>
              <div className="relative">
                <Select value={platform} onValueChange={(v) => onPlatformChange(v as ZkSendPlatform)}>
                  <SelectTrigger id="platform-select" aria-label="Platform" className="pl-10">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twitter">
                      <div className="flex items-center gap-2">
                        <Twitter className="h-4 w-4" />
                        <span>Twitter / X</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="twitch">
                      <div className="flex items-center gap-2">
                        <Twitch className="h-4 w-4" />
                        <span>Twitch</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="github">
                      <div className="flex items-center gap-2">
                        <Github className="h-4 w-4" />
                        <span>GitHub</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="instagram">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        <span>Instagram</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="tiktok">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        <span>TikTok</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="gmail">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Gmail</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="linkedin">
                      <div className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4" />
                        <span>LinkedIn</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <PlatformIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username-input">Username</Label>
              <div className="relative">
                <Input
                  id="username-input"
                  value={username}
                  onChange={(e) => onUsernameChange(e.target.value)}
                  placeholder="@username"
                  aria-label="Username"
                  className={isValid ? 'border-emerald-200 focus:border-emerald-400' : ''}
                />
                {isValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                )}
              </div>
              {!isValid && username.length > 0 && (
                <div className="text-xs text-amber-600">Enter a valid username</div>
              )}
            </div>
          </div>

          {!isValid && (
            <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
              Select platform and enter username to continue
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

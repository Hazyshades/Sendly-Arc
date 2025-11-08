export interface TwitterContact {
  twitter_user_id: string;
  username: string;
  display_name: string;
  followed_at: string;
  is_favorite?: boolean;
}

export interface TwitchContact {
  twitch_user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  followed_at: string;
  is_favorite?: boolean;
}

export interface TikTokContact {
  tiktok_user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  followed_at: string;
  is_favorite?: boolean;
}

export interface InstagramContact {
  instagram_user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  followed_at: string;
  is_favorite?: boolean;
}

export interface TelegramContact {
  telegram_user_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  display_name: string;
  phone_number?: string;
  avatar_url?: string;
  is_bot?: boolean;
  language_code?: string;
  synced_at?: string;
  is_favorite?: boolean;
}

export interface UnifiedContact {
  id: string;
  platform: 'twitter' | 'twitch' | 'tiktok' | 'instagram' | 'telegram';
  username: string;
  display_name: string;
  avatar_url?: string;
  followed_at: string;
}

export interface TwitterCardMapping {
  tokenId: string;
  username: string;
  temporaryOwner: string;
  senderAddress: string;
  amount: string;
  currency: string;
  message: string;
  metadataUri: string;
  status: 'pending' | 'claimed';
  createdAt: string;
  claimedAt: string | null;
  realOwner: string | null;
}

export interface TwitchCardMapping {
  tokenId: string;
  username: string;
  temporaryOwner: string;
  senderAddress: string;
  amount: string;
  currency: string;
  message: string;
  metadataUri: string;
  status: 'pending' | 'claimed';
  createdAt: string;
  claimedAt: string | null;
  realOwner: string | null;
}

export interface TelegramCardMapping {
  tokenId: string;
  username: string;
  temporaryOwner: string;
  senderAddress: string;
  amount: string;
  currency: string;
  message: string;
  metadataUri: string;
  status: 'pending' | 'claimed';
  createdAt: string;
  claimedAt: string | null;
  realOwner: string | null;
}

export interface TikTokCardMapping {
  tokenId: string;
  username: string;
  temporaryOwner: string;
  senderAddress: string;
  amount: string;
  currency: string;
  message: string;
  metadataUri: string;
  status: 'pending' | 'claimed';
  createdAt: string;
  claimedAt: string | null;
  realOwner: string | null;
}

export interface InstagramCardMapping {
  tokenId: string;
  username: string;
  temporaryOwner: string;
  senderAddress: string;
  amount: string;
  currency: string;
  message: string;
  metadataUri: string;
  status: 'pending' | 'claimed';
  createdAt: string;
  claimedAt: string | null;
  realOwner: string | null;
}


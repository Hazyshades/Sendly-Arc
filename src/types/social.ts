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

export interface UnifiedContact {
  id: string;
  platform: 'twitter' | 'twitch' | 'tiktok' | 'instagram';
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


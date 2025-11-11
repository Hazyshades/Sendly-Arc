export interface GiftCardRecord {
  id?: number;
  token_id: string;
  sender_address: string;
  recipient_address?: string | null;
  recipient_username?: string | null;
  recipient_type: 'address' | 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram';
  amount: string;
  currency: 'USDC' | 'EURC' | 'USYC';
  message: string;
  redeemed: boolean;
  tx_hash?: string | null;
  block_number?: number | null;
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string | null;
}

export interface GiftCardInsert {
  token_id: string;
  sender_address: string;
  recipient_address?: string | null;
  recipient_username?: string | null;
  recipient_type: 'address' | 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram';
  amount: string;
  currency: 'USDC' | 'EURC' | 'USYC';
  message: string;
  redeemed?: boolean;
  tx_hash?: string | null;
  block_number?: number | null;
}

export interface TwitterContact {
  twitter_user_id: string;
  username: string;
  display_name: string;
  followed_at: string;
}

export interface TikTokContact {
  tiktok_user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  followed_at: string;
}

export interface InstagramContact {
  instagram_user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  followed_at: string;
}

export interface TelegramContact {
  telegram_user_id: string;
  username?: string;
  display_name: string;
  avatar_url?: string;
  synced_at?: string;
}

export interface UnifiedContact {
  id: string;
  platform: 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram';
  username: string;
  display_name: string;
  avatar_url?: string;
  followed_at: string;
}


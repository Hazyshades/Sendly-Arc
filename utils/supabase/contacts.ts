import { supabase } from './client';
import type { TwitchContact } from '../twitch/contactsAPI';
import type { TwitterContact, TikTokContact, InstagramContact, UnifiedContact } from '../../src/types/social';

export type { TwitterContact, TikTokContact, InstagramContact, UnifiedContact };

export interface Contact {
  name: string;
  wallet?: string;
  source?: 'manual' | 'twitch' | 'twitter' | 'tiktok' | 'instagram';
  socialId?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export async function syncTwitchContacts(
  userId: string,
  contacts: TwitchContact[]
): Promise<void> {
  if (contacts.length === 0) {
    return;
  }

  const records = contacts.map((contact) => ({
    user_id: userId,
    broadcaster_id: contact.broadcaster_id,
    broadcaster_login: contact.broadcaster_login,
    broadcaster_name: contact.broadcaster_name,
    followed_at: contact.followed_at ? new Date(contact.followed_at).toISOString() : null,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('twitch_followed')
    .upsert(records, {
      onConflict: 'user_id,broadcaster_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error syncing Twitch contacts:', error);
    throw new Error(`Failed to sync Twitch contacts: ${error.message}`);
  }
}

export async function getTwitchContacts(userId: string): Promise<TwitchContact[]> {
  const { data, error } = await supabase
    .from('twitch_followed')
    .select('*')
    .eq('user_id', userId)
    .order('broadcaster_name', { ascending: true });

  if (error) {
    console.error('Error fetching Twitch contacts:', error);
    throw new Error(`Failed to fetch Twitch contacts: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((row) => ({
    broadcaster_id: row.broadcaster_id,
    broadcaster_login: row.broadcaster_login,
    broadcaster_name: row.broadcaster_name,
    followed_at: row.followed_at || new Date().toISOString(),
  }));
}

export async function syncTwitterContacts(
  userId: string,
  contacts: TwitterContact[]
): Promise<void> {
  if (contacts.length === 0) {
    return;
  }

  const records = contacts.map((contact) => ({
    user_id: userId,
    twitter_user_id: contact.twitter_user_id,
    username: contact.username,
    display_name: contact.display_name,
    followed_at: contact.followed_at ? new Date(contact.followed_at).toISOString() : null,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('twitter_followed')
    .upsert(records, {
      onConflict: 'user_id,twitter_user_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error syncing Twitter contacts:', error);
    throw new Error(`Failed to sync Twitter contacts: ${error.message}`);
  }
}

export async function getTwitterContacts(userId: string): Promise<TwitterContact[]> {
  const { data, error } = await supabase
    .from('twitter_followed')
    .select('*')
    .eq('user_id', userId)
    .order('display_name', { ascending: true });

  if (error) {
    console.error('Error fetching Twitter contacts:', error);
    throw new Error(`Failed to fetch Twitter contacts: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((row) => ({
    twitter_user_id: row.twitter_user_id,
    username: row.username,
    display_name: row.display_name,
    followed_at: row.followed_at || new Date().toISOString(),
  }));
}

export async function syncTikTokContacts(
  userId: string,
  contacts: TikTokContact[]
): Promise<void> {
  if (contacts.length === 0) {
    return;
  }

  const records = contacts.map((contact) => ({
    user_id: userId,
    tiktok_user_id: contact.tiktok_user_id,
    username: contact.username,
    display_name: contact.display_name,
    avatar_url: contact.avatar_url || null,
    followed_at: contact.followed_at ? new Date(contact.followed_at).toISOString() : null,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('tiktok_followed')
    .upsert(records, {
      onConflict: 'user_id,tiktok_user_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error syncing TikTok contacts:', error);
    throw new Error(`Failed to sync TikTok contacts: ${error.message}`);
  }
}

export async function getTikTokContacts(userId: string): Promise<TikTokContact[]> {
  const { data, error } = await supabase
    .from('tiktok_followed')
    .select('*')
    .eq('user_id', userId)
    .order('display_name', { ascending: true });

  if (error) {
    console.error('Error fetching TikTok contacts:', error);
    throw new Error(`Failed to fetch TikTok contacts: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((row) => ({
    tiktok_user_id: row.tiktok_user_id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    followed_at: row.followed_at || new Date().toISOString(),
  }));
}

export async function syncInstagramContacts(
  userId: string,
  contacts: InstagramContact[]
): Promise<void> {
  if (contacts.length === 0) {
    return;
  }

  const records = contacts.map((contact) => ({
    user_id: userId,
    instagram_user_id: contact.instagram_user_id,
    username: contact.username,
    display_name: contact.display_name,
    avatar_url: contact.avatar_url || null,
    followed_at: contact.followed_at ? new Date(contact.followed_at).toISOString() : null,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('instagram_followed')
    .upsert(records, {
      onConflict: 'user_id,instagram_user_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error syncing Instagram contacts:', error);
    throw new Error(`Failed to sync Instagram contacts: ${error.message}`);
  }
}

export async function getInstagramContacts(userId: string): Promise<InstagramContact[]> {
  const { data, error } = await supabase
    .from('instagram_followed')
    .select('*')
    .eq('user_id', userId)
    .order('display_name', { ascending: true });

  if (error) {
    console.error('Error fetching Instagram contacts:', error);
    throw new Error(`Failed to fetch Instagram contacts: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((row) => ({
    instagram_user_id: row.instagram_user_id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    followed_at: row.followed_at || new Date().toISOString(),
  }));
}

export async function getAllSocialContacts(userId: string): Promise<Contact[]> {
  const [twitchContacts, twitterContacts, tiktokContacts, instagramContacts] = await Promise.all([
    getTwitchContacts(userId).catch(() => []),
    getTwitterContacts(userId).catch(() => []),
    getTikTokContacts(userId).catch(() => []),
    getInstagramContacts(userId).catch(() => []),
  ]);

  const unified: Contact[] = [];

  twitchContacts.forEach((contact) => {
    unified.push({
      name: contact.broadcaster_name,
      source: 'twitch',
      socialId: contact.broadcaster_id,
      username: contact.broadcaster_login,
      displayName: contact.broadcaster_name,
    });
  });

  twitterContacts.forEach((contact) => {
    unified.push({
      name: contact.display_name,
      source: 'twitter',
      socialId: contact.twitter_user_id,
      username: contact.username,
      displayName: contact.display_name,
    });
  });

  tiktokContacts.forEach((contact) => {
    unified.push({
      name: contact.display_name,
      source: 'tiktok',
      socialId: contact.tiktok_user_id,
      username: contact.username,
      displayName: contact.display_name,
      avatarUrl: contact.avatar_url,
    });
  });

  instagramContacts.forEach((contact) => {
    unified.push({
      name: contact.display_name,
      source: 'instagram',
      socialId: contact.instagram_user_id,
      username: contact.username,
      displayName: contact.display_name,
      avatarUrl: contact.avatar_url,
    });
  });

  return unified;
}


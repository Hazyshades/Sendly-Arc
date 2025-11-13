import { supabase } from './client';
import type { GiftCardRecord, GiftCardInsert } from '../../src/types/giftCard';

export type { GiftCardRecord, GiftCardInsert };

export class GiftCardsService {
  static async upsertCard(card: GiftCardInsert): Promise<GiftCardRecord | null> {
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .upsert({
          ...card,
          last_synced_at: new Date().toISOString(),
        }, {
          onConflict: 'token_id',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting gift card:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error upserting gift card:', error);
      return null;
    }
  }

  static async getCardsBySender(senderAddress: string): Promise<GiftCardRecord[]> {
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('sender_address', senderAddress.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sent cards:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching sent cards:', error);
      return [];
    }
  }

  static async getCardsByRecipientAddress(recipientAddress: string): Promise<GiftCardRecord[]> {
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('recipient_address', recipientAddress.toLowerCase())
        .eq('recipient_type', 'address')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching received cards:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching received cards:', error);
      return [];
    }
  }

  static async getAllCardsWithNullRecipient(): Promise<GiftCardRecord[]> {
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .is('recipient_address', null)
        .eq('recipient_type', 'address')
        .order('created_at', { ascending: false })
        .limit(100); 

      if (error) {
        console.error('Error fetching cards with null recipient:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching cards with null recipient:', error);
      return [];
    }
  }

  static async getCardByTokenId(tokenId: string): Promise<GiftCardRecord | null> {
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('token_id', tokenId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching card by token ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching card by token ID:', error);
      return null;
    }
  }

  static async updateCardRedeemedStatus(tokenId: string, redeemed: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('gift_cards')
        .update({
          redeemed,
          last_synced_at: new Date().toISOString(),
        })
        .eq('token_id', tokenId);

      if (error) {
        console.error('Error updating card redeemed status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating card redeemed status:', error);
      return false;
    }
  }

  static async bulkUpsertCards(cards: GiftCardInsert[]): Promise<boolean> {
    try {
      const cardsWithTimestamp = cards.map(card => ({
        ...card,
        last_synced_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('gift_cards')
        .upsert(cardsWithTimestamp, {
          onConflict: 'token_id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Error bulk upserting cards:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error bulk upserting cards:', error);
      return false;
    }
  }

  static async getCardsByRecipientUsername(
    recipientUsername: string,
    recipientType: 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram'
  ): Promise<GiftCardRecord[]> {
    try {
      // Normalize username: remove @ and convert to lowercase
      const normalizedUsername = recipientUsername.toLowerCase().replace(/^@/, '').trim();
      
      console.log('[GiftCardsService] Fetching cards by recipient username:', {
        original: recipientUsername,
        normalized: normalizedUsername,
        recipientType
      });
      
      // First try exact match with normalized username
      let { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('recipient_username', normalizedUsername)
        .eq('recipient_type', recipientType)
        .eq('redeemed', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[GiftCardsService] Error fetching cards (exact match):', error);
        return [];
      }

      // If no results, try case-insensitive search (in case username was saved with different case)
      if (!data || data.length === 0) {
        console.log('[GiftCardsService] No exact match found, trying case-insensitive search');
        
        // Get all cards with matching recipient_type and check username manually
        const { data: allData, error: allError } = await supabase
          .from('gift_cards')
          .select('*')
          .eq('recipient_type', recipientType)
          .eq('redeemed', false)
          .order('created_at', { ascending: false });

        if (allError) {
          console.error('[GiftCardsService] Error fetching all cards:', allError);
          return [];
        }

        // Filter by normalized username (handle both with and without @)
        data = (allData || []).filter(card => {
          if (!card.recipient_username) return false;
          const cardUsername = card.recipient_username.toLowerCase().replace(/^@/, '').trim();
          return cardUsername === normalizedUsername;
        });
        
        console.log('[GiftCardsService] Found cards with case-insensitive search:', data.length);
      } else {
        console.log('[GiftCardsService] Found cards with exact match:', data.length);
      }

      return data || [];
    } catch (error) {
      console.error('[GiftCardsService] Error fetching cards by recipient username:', error);
      return [];
    }
  }
}


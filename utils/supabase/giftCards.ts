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
}


import { apiCall } from '../supabase/client';

export interface DeveloperWallet {
  id?: number;
  user_id: string;
  circle_wallet_id: string;
  circle_wallet_set_id?: string;
  wallet_address: string;
  blockchain: string;
  account_type: 'EOA' | 'SCA';
  state: 'LIVE' | 'FROZEN';
  custody_type: 'DEVELOPER';
  created_at?: string;
  updated_at?: string;
  telegram_user_id?: string | null;
}

export interface CreateWalletRequest {
  userId: string;
  blockchain?: string;
  accountType?: 'EOA' | 'SCA';
}

export interface CreateWalletResponse {
  success: boolean;
  wallet: DeveloperWallet;
  circleWallet?: any;
  message?: string;
}

export interface GetWalletsResponse {
  success: boolean;
  wallets: DeveloperWallet[];
}

export interface LinkTelegramRequest {
  walletAddress: string;
  blockchain: string;
  telegramUserId: string;
  signature?: string;
  message?: string;
  privyUserId?: string;
  validateTelegram?: boolean;
}

export interface LinkTelegramResponse {
  success: boolean;
  wallet?: DeveloperWallet;
  message?: string;
  error?: string;
  details?: string;
  conflict?: {
    wallet_address: string;
    blockchain: string;
    user_id: string;
  } | null;
}

/**
 * Service for managing Circle Developer-Controlled Wallets
 */
export class DeveloperWalletService {
  /**
   * Create a new Developer-Controlled Wallet for a user
   */
  static async createWallet(request: CreateWalletRequest): Promise<CreateWalletResponse> {
    try {
      const response = await apiCall('/wallets/create', {
        method: 'POST',
        body: JSON.stringify({
          userId: request.userId.toLowerCase(),
          blockchain: request.blockchain || 'ARC-TESTNET',
          accountType: request.accountType || 'EOA'
        })
      });

      return response as CreateWalletResponse;
    } catch (error) {
      console.error('Error creating developer wallet:', error);
      throw error;
    }
  }

  /**
   * Get all Developer-Controlled Wallets for a user
   */
  static async getWallets(userId: string): Promise<DeveloperWallet[]> {
    try {
      const response = await apiCall(`/wallets?userId=${encodeURIComponent(userId.toLowerCase())}`, {
        method: 'GET'
      }) as GetWalletsResponse;

      return response.wallets || [];
    } catch (error) {
      console.error('Error fetching developer wallets:', error);
      throw error;
    }
  }

  /**
   * Get a specific wallet by blockchain
   */
  static async getWalletByBlockchain(userId: string, blockchain: string): Promise<DeveloperWallet | null> {
    try {
      const wallets = await this.getWallets(userId);
      return wallets.find(w => w.blockchain === blockchain) || null;
    } catch (error) {
      console.error('Error fetching wallet by blockchain:', error);
      throw error;
    }
  }

  /**
   * Check if user has a wallet for a specific blockchain
   */
  static async hasWallet(userId: string, blockchain: string): Promise<boolean> {
    try {
      const wallet = await this.getWalletByBlockchain(userId, blockchain);
      return wallet !== null;
    } catch (error) {
      console.error('Error checking wallet existence:', error);
      return false;
    }
  }

  /**
   * Request testnet tokens for a wallet
   */
  static async requestTestnetTokens(walletAddress: string, blockchain: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiCall('/wallets/request-testnet-tokens', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress,
          blockchain
        })
      });

      return response as { success: boolean; message?: string };
    } catch (error) {
      console.error('Error requesting testnet tokens:', error);
      throw error;
    }
  }

  /**
   * Link Telegram ID to a developer wallet
   */
  static async linkTelegram(request: LinkTelegramRequest): Promise<LinkTelegramResponse> {
    try {
      const response = await apiCall('/wallets/link-telegram', {
        method: 'POST',
        body: JSON.stringify({
          wallet_address: request.walletAddress,
          blockchain: request.blockchain,
          telegram_user_id: request.telegramUserId,
          signature: request.signature,
          message: request.message,
          privy_user_id: request.privyUserId,
          validateTelegram: request.validateTelegram ?? false
        })
      });

      return response as LinkTelegramResponse;
    } catch (error) {
      console.error('Error linking Telegram ID:', error);
      throw error;
    }
  }
}


import { useState, useEffect } from 'react';
import { Gift, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from './ui/empty';
import { Spinner } from './ui/spinner';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { arcTestnet } from '../utils/web3/wagmiConfig';
import web3Service from '../utils/web3/web3Service';
import { ClaimCards } from './ClaimCards';
import { usePrivy } from '@privy-io/react-auth';
import { GiftCardsService, type GiftCardInsert } from '../utils/supabase/giftCards';

interface GiftCard {
  tokenId: string;
  amount: string;
  currency: 'USDC' | 'EURC';
  design: string;
  message: string;
  recipient: string;
  sender: string;
  status: 'active' | 'redeemed' | 'expired' | 'pending';
  createdAt: string;
  expiresAt?: string;
  hasTimer: boolean;
  hasPassword: boolean;
  qrCode: string;
  metadataUri?: string;
}

interface MyCardsProps {
  onSpendCard: (tokenId: string) => void;
}

export function MyCards({ onSpendCard }: MyCardsProps) {
  const { address, isConnected } = useAccount();
  const { authenticated, user } = usePrivy();
  const telegramAccount = (user as any)?.telegram;
  const telegramUsername = ((telegramAccount?.username || telegramAccount?.telegramUserId || telegramAccount?.id || '') as string).replace(/^@/, '').trim();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [sentCards, setSentCards] = useState<GiftCard[]>([]);
  const [receivedCards, setReceivedCards] = useState<GiftCard[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'redeemed': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'redeemed': return <CheckCircle className="w-4 h-4" />;
      case 'expired': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <Gift className="w-4 h-4" />;
    }
  };

  const fetchPendingCardsCount = async () => {
    if (!authenticated || !isConnected || !address) {
      setPendingCount(0);
      return;
    }

    const hasTwitter = user?.twitter?.username;
    const hasTwitch = user?.twitch?.username;
    const hasTelegram = telegramUsername;

    if (!hasTwitter && !hasTwitch && !hasTelegram) {
      setPendingCount(0);
      return;
    }

    try {
      const walletClient = createWalletClient({
        chain: arcTestnet,
        transport: custom(window.ethereum)
      });
      await web3Service.initialize(walletClient, address);
      
      let totalCount = 0;

      if (hasTwitter) {
        try {
          const twitterUsername = user!.twitter!.username;
          if (twitterUsername) {
            const tokenIds = await web3Service.getPendingTwitterCards(twitterUsername);
            totalCount += tokenIds.length;
          }
        } catch (error) {
          console.error('Error fetching Twitter pending cards count:', error);
        }
      }

      if (hasTwitch) {
        try {
          const twitchUsername = user!.twitch!.username;
          if (twitchUsername) {
            const tokenIds = await web3Service.getPendingTwitchCards(twitchUsername);
            totalCount += tokenIds.length;
          }
        } catch (error) {
          console.error('Error fetching Twitch pending cards count:', error);
        }
      }

      if (hasTelegram) {
        try {
          if (telegramUsername) {
            const tokenIds = await web3Service.getPendingTelegramCards(telegramUsername);
            totalCount += tokenIds.length;
          }
        } catch (error) {
          console.error('Error fetching Telegram pending cards count:', error);
        }
      }

      setPendingCount(totalCount);
    } catch (error) {
      console.error('Error fetching pending cards count:', error);
      setPendingCount(0);
    }
  };

  useEffect(() => {
    if (isConnected && address && !hasFetched) {
      setHasFetched(true);
      fetchCards();
    } else if (!isConnected || !address) {
      setLoading(false);
      setHasFetched(false);
    }
  }, [isConnected, address, hasFetched]);

  useEffect(() => {
    if (authenticated && isConnected && address) {
      fetchPendingCardsCount();
    } else {
      setPendingCount(0);
    }
  }, [authenticated, user?.twitter?.username, user?.twitch?.username, telegramUsername, isConnected, address]);

  const fetchCards = async () => {
    if (!isConnected || !address) return;

    try {
      // First, try to load from Supabase cache (fast) - display immediately
      console.log('Loading cards from Supabase cache...');
      const [supabaseReceivedCards, supabaseSentCards] = await Promise.all([
        GiftCardsService.getCardsByRecipientAddress(address),
        GiftCardsService.getCardsBySender(address)
      ]);

      // Transform Supabase data to our format
      const transformedReceivedCards: GiftCard[] = supabaseReceivedCards.map(card => ({
        tokenId: card.token_id,
        amount: card.amount,
        currency: card.currency,
        design: 'pink',
        message: card.message,
        recipient: address,
        sender: card.sender_address,
        status: card.redeemed ? 'redeemed' : 'active',
        createdAt: card.created_at ? new Date(card.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        hasTimer: false,
        hasPassword: false,
        qrCode: `sendly://redeem/${card.token_id}`
      }));

      const transformedSentCards: GiftCard[] = supabaseSentCards.map(card => {
        const username = card.recipient_username ? card.recipient_username.replace(/^@/, '') : null;
        const recipientDisplay = (() => {
          switch (card.recipient_type) {
            case 'twitter':
              return username ? `@${username}` : 'Twitter user';
            case 'telegram':
              return username ? `@${username} (Telegram)` : 'Telegram user';
            case 'twitch':
              return username ? `${username} (Twitch)` : 'Twitch user';
            default:
              return card.recipient_address || 'Unknown';
          }
        })();

        return {
          tokenId: card.token_id,
          amount: card.amount,
          currency: card.currency,
          design: 'pink',
          message: card.message,
          recipient: recipientDisplay,
          sender: address,
          status: card.redeemed ? 'redeemed' : 'active',
          createdAt: card.created_at ? new Date(card.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
          hasTimer: false,
          hasPassword: false,
          qrCode: `sendly://redeem/${card.token_id}`
        };
      });

      // Update UI with cached data immediately - don't wait for blockchain!
      setReceivedCards(transformedReceivedCards);
      setSentCards(transformedSentCards);
      setLoading(false);

      // Then sync with blockchain in the background (slow, but non-blocking)
      // Start sync without await to avoid blocking UI
      console.log('Starting blockchain sync in background...');
      syncWithBlockchain(address).catch(error => {
        console.error('Background sync error (non-critical):', error);
      });
    } catch (error) {
      console.error('Error fetching cards from Supabase:', error);
      // Fallback to blockchain if Supabase fails
      await fetchCardsFromBlockchain();
    }
  };

  const syncWithBlockchain = async (userAddress: string) => {
    try {
      
      // Initialize web3 service
      const walletClient = createWalletClient({
        chain: arcTestnet,
        transport: custom(window.ethereum)
      });

      await web3Service.initialize(walletClient, userAddress);
      
      // Load gift cards from blockchain
      console.log('Loading received cards from blockchain...');
      const blockchainCards = await web3Service.loadGiftCards(false, true);
      
      // Load sent cards
      console.log('Loading sent cards from blockchain...');
      const sentBlockchainCards = await web3Service.loadSentGiftCards(false, true);
      console.log(`Synced ${blockchainCards.length} received and ${sentBlockchainCards.length} sent cards from blockchain`);
      
      // Also check cards with NULL recipient_address in Supabase
      // and update their owners from blockchain
      console.log('Checking cards with null recipient_address...');
      const cardsWithNullRecipient = await GiftCardsService.getAllCardsWithNullRecipient();
      console.log(`Found ${cardsWithNullRecipient.length} cards with null recipient_address`);
      
      // Check owners for cards with NULL recipient_address
      const cardsToUpdate: GiftCardInsert[] = [];
      const maxConcurrentChecks = 5; // Limit concurrent requests
      
      for (let i = 0; i < cardsWithNullRecipient.length; i += maxConcurrentChecks) {
        const batch = cardsWithNullRecipient.slice(i, i + maxConcurrentChecks);
        const ownerChecks = await Promise.all(
          batch.map(async (card) => {
            try {
              const owner = await web3Service.getCardOwner(card.token_id);
              // If card belongs to current user, update recipient_address
              if (owner.toLowerCase() === userAddress.toLowerCase()) {
                return {
                  token_id: card.token_id,
                  sender_address: card.sender_address,
                  recipient_address: userAddress.toLowerCase(),
                  recipient_username: null,
                  recipient_type: 'address' as const,
                  amount: card.amount,
                  currency: card.currency,
                  message: card.message,
                  redeemed: card.redeemed,
                };
              }
              return null;
            } catch (error) {
              console.warn(`Failed to check owner for card ${card.token_id}:`, error);
              return null;
            }
          })
        );
        
        cardsToUpdate.push(...ownerChecks.filter(card => card !== null) as GiftCardInsert[]);
      }
      
      if (cardsToUpdate.length > 0) {
        console.log(`Updating ${cardsToUpdate.length} cards with owner information`);
      }
      
      // Transform and update Supabase cache
      // Use Map for deduplication by token_id (keep latest version)
      const cardsMap = new Map<string, GiftCardInsert>();
      
      // Add received cards from blockchain
      blockchainCards.forEach(card => {
        cardsMap.set(card.tokenId, {
          token_id: card.tokenId,
          sender_address: card.sender.toLowerCase(),
          recipient_address: card.recipient.toLowerCase(),
          recipient_username: null,
          recipient_type: 'address' as const,
          amount: card.amount,
          currency: card.token,
          message: card.message,
          redeemed: card.redeemed,
        });
      });
      
      // Add sent cards (overwrite if duplicates exist)
      sentBlockchainCards.forEach(card => {
        const rawRecipient = card.recipient || '';
        const lowercaseRecipient = rawRecipient.toLowerCase();
        let recipientAddress: string | null = null;
        let recipientUsername: string | null = null;
        let recipientType: 'address' | 'twitter' | 'twitch' | 'telegram' = 'address';

        if (lowercaseRecipient.startsWith('0x')) {
          recipientAddress = rawRecipient.toLowerCase();
        } else if (lowercaseRecipient.startsWith('telegram:')) {
          recipientType = 'telegram';
          recipientUsername = rawRecipient.slice('telegram:'.length).replace(/^@/, '').trim();
        } else if (lowercaseRecipient.startsWith('twitter:') || rawRecipient.startsWith('@')) {
          recipientType = 'twitter';
          const usernamePart = lowercaseRecipient.startsWith('twitter:')
            ? rawRecipient.slice('twitter:'.length)
            : rawRecipient;
          recipientUsername = usernamePart.replace(/^@/, '').trim();
        } else if (lowercaseRecipient.length > 0) {
          recipientType = 'twitch';
          const usernamePart = lowercaseRecipient.startsWith('twitch:')
            ? rawRecipient.slice('twitch:'.length)
            : rawRecipient;
          recipientUsername = usernamePart.replace(/^@/, '').trim();
        }

        cardsMap.set(card.tokenId, {
          token_id: card.tokenId,
          sender_address: userAddress.toLowerCase(),
          recipient_address: recipientAddress,
          recipient_username: recipientUsername,
          recipient_type: recipientType,
          amount: card.amount,
          currency: card.token,
          message: card.message,
          redeemed: card.redeemed,
        });
      });
      
      // Add updated cards (overwrite if duplicates exist)
      cardsToUpdate.forEach(card => {
        cardsMap.set(card.token_id, card);
      });
      
      // Convert Map to array (already without duplicates)
      const cardsToCache = Array.from(cardsMap.values());
      
      console.log(`Sending ${cardsToCache.length} unique cards to Supabase (removed duplicates)`);

      // Update Supabase cache
      await GiftCardsService.bulkUpsertCards(cardsToCache);
      console.log('Cache updated with blockchain data');

      // Update UI only if new cards found or statuses changed
      // Use functional update to access current values
      setReceivedCards(currentReceivedCards => {
        const existingReceivedMap = new Map(currentReceivedCards.map(card => [card.tokenId, card]));

        // Transform received cards
        const transformedReceivedCards: GiftCard[] = blockchainCards.map(card => ({
          tokenId: card.tokenId,
          amount: card.amount,
          currency: card.token,
          design: 'pink',
          message: card.message,
          recipient: card.recipient,
          sender: card.sender,
          status: card.redeemed ? 'redeemed' : 'active',
          createdAt: existingReceivedMap.get(card.tokenId)?.createdAt || new Date().toLocaleDateString(),
          hasTimer: false,
          hasPassword: false,
          qrCode: `sendly://redeem/${card.tokenId}`
        }));

        // Update only if there are changes (new cards or status changed)
        const receivedChanged = currentReceivedCards.length !== transformedReceivedCards.length ||
          currentReceivedCards.some(card => {
            const newCard = transformedReceivedCards.find(c => c.tokenId === card.tokenId);
            return newCard && newCard.status !== card.status;
          });

        return receivedChanged ? transformedReceivedCards : currentReceivedCards;
      });

      setSentCards(currentSentCards => {
        const existingSentMap = new Map(currentSentCards.map(card => [card.tokenId, card]));

        // Transform sent cards
        const transformedSentCards: GiftCard[] = sentBlockchainCards.map(card => {
          const rawRecipient = card.recipient || '';
          const lowercaseRecipient = rawRecipient.toLowerCase();
          let recipientDisplay = rawRecipient;

          if (lowercaseRecipient.startsWith('telegram:')) {
            const username = rawRecipient.slice('telegram:'.length).replace(/^@/, '').trim();
            recipientDisplay = username ? `@${username} (Telegram)` : 'Telegram user';
          } else if (lowercaseRecipient.startsWith('twitter:')) {
            const username = rawRecipient.slice('twitter:'.length).replace(/^@/, '').trim();
            recipientDisplay = username ? `@${username}` : 'Twitter user';
          } else if (rawRecipient.startsWith('@')) {
            recipientDisplay = rawRecipient;
          } else if (lowercaseRecipient.startsWith('twitch:')) {
            const username = rawRecipient.slice('twitch:'.length).trim();
            recipientDisplay = username ? `${username} (Twitch)` : 'Twitch user';
          } else if (!lowercaseRecipient.startsWith('0x') && lowercaseRecipient.length > 0) {
            recipientDisplay = `${rawRecipient} (Twitch)`;
          }

          return {
            tokenId: card.tokenId,
            amount: card.amount,
            currency: card.token,
            design: 'pink',
            message: card.message,
            recipient: recipientDisplay,
            sender: userAddress,
            status: card.redeemed ? 'redeemed' : 'active',
            createdAt: existingSentMap.get(card.tokenId)?.createdAt || new Date().toLocaleDateString(),
            hasTimer: false,
            hasPassword: false,
            qrCode: `sendly://redeem/${card.tokenId}`
          };
        });

        // Update only if there are changes (new cards or status changed)
        const sentChanged = currentSentCards.length !== transformedSentCards.length ||
          currentSentCards.some(card => {
            const newCard = transformedSentCards.find(c => c.tokenId === card.tokenId);
            return newCard && newCard.status !== card.status;
          });

        return sentChanged ? transformedSentCards : currentSentCards;
      });
      
      console.log('Blockchain sync completed');
    } catch (error) {
      console.error('Error syncing with blockchain:', error);
      // Don't show error to user - they already have data from Supabase
    } finally {
    }
  };

  const fetchCardsFromBlockchain = async () => {
    if (!isConnected || !address) return;

    try {
      setLoading(true);
      
      // Initialize web3 service
      const walletClient = createWalletClient({
        chain: arcTestnet,
        transport: custom(window.ethereum)
      });

      await web3Service.initialize(walletClient, address);
      
      // Load gift cards from blockchain
      const blockchainCards = await web3Service.loadGiftCards(false, true);
      
      // Load sent cards
      console.log('Fetching sent gift cards...');
      const sentBlockchainCards = await web3Service.loadSentGiftCards(false, true);
      console.log(`Received ${sentBlockchainCards.length} sent cards from blockchain`);
      
      // Transform blockchain data to our format for received cards
      const transformedCards: GiftCard[] = blockchainCards.map(card => ({
        tokenId: card.tokenId,
        amount: card.amount,
        currency: card.token,
        design: 'pink',
        message: card.message,
        recipient: card.recipient,
        sender: card.sender,
        status: card.redeemed ? 'redeemed' : 'active',
        createdAt: new Date().toLocaleDateString(),
        hasTimer: false,
        hasPassword: false,
        qrCode: `sendly://redeem/${card.tokenId}`
      }));

      // Transform blockchain data to our format for sent cards
      const transformedSentCards: GiftCard[] = sentBlockchainCards.map(card => ({
        tokenId: card.tokenId,
        amount: card.amount,
        currency: card.token,
        design: 'pink',
        message: card.message,
        recipient: card.recipient,
        sender: address,
        status: card.redeemed ? 'redeemed' : 'active',
        createdAt: new Date().toLocaleDateString(),
        hasTimer: false,
        hasPassword: false,
        qrCode: `sendly://redeem/${card.tokenId}`
      }));

      // Update card state
      setReceivedCards(transformedCards);
      setSentCards(transformedSentCards);
    } catch (error) {
      console.error('Error fetching cards:', error);
      if (!(error as Error).message?.includes('rate limit') && !(error as Error).message?.includes('429')) {
        toast.error('Failed to load gift cards');
      }
    } finally {
      setLoading(false);
    }
  };


  const filteredSentCards = sentCards.filter(card => {
    const matchesSearch = card.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         card.recipient.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || card.status === filterStatus;
    const matchesCurrency = filterCurrency === 'all' || card.currency === filterCurrency;
    return matchesSearch && matchesStatus && matchesCurrency;
  });

  const filteredReceivedCards = receivedCards.filter(card => {
    const matchesSearch = card.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         card.sender.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || card.status === filterStatus;
    const matchesCurrency = filterCurrency === 'all' || card.currency === filterCurrency;
    return matchesSearch && matchesStatus && matchesCurrency;
  });

  if (!isConnected) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Gift className="w-12 h-12 opacity-50" />
            </EmptyMedia>
            <EmptyTitle>Connect your wallet</EmptyTitle>
            <EmptyDescription>
              Please connect your wallet to view your gift cards
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Spinner className="w-6 h-6" />
          <span className="text-gray-600">Loading gift cards...</span>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">My gift cards</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-128"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="redeemed">Redeemed</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCurrency} onValueChange={setFilterCurrency}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="USDC">USDC</SelectItem>
              <SelectItem value="EURC">EURC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Tabs defaultValue="received" className="w-full">
        <TabsList className={`grid w-full ${authenticated ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="sent">Sent ({sentCards.length})</TabsTrigger>
          <TabsTrigger value="received">Received ({receivedCards.length})</TabsTrigger>
          {authenticated && (
            <TabsTrigger value="pending">Pending Claims ({pendingCount})</TabsTrigger>
          )}
        </TabsList>
        
        {authenticated && (
          <TabsContent value="pending" className="space-y-4">
            <ClaimCards 
              autoLoad={true}
              onCardClaimed={() => {
                if (isConnected && address) {
                  fetchCards();
                  fetchPendingCardsCount();
                }
              }}
              onPendingCountChange={setPendingCount}
            />
          </TabsContent>
        )}
        
        <TabsContent value="sent" className="space-y-4">
          {filteredSentCards.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No sent gift cards found</p>
              </div>
            ) : (
            filteredSentCards.map((card) => (
              <Card key={card.tokenId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
                        card.design === 'pink' ? 'from-pink-400 to-purple-500' :
                        card.design === 'blue' ? 'from-blue-400 to-cyan-500' :
                        'from-green-400 to-emerald-500'
                      } flex items-center justify-center`}>
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">${card.amount} {card.currency}</CardTitle>
                        <p className="text-sm text-gray-600">To: {card.recipient.slice(0, 6)}...{card.recipient.slice(-4)}</p>
                        <p className="text-xs text-gray-500">Token ID: {card.tokenId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(card.status)}>
                        {getStatusIcon(card.status)}
                        {card.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-3">"{card.message}"</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Created: {card.createdAt}</span>
                    {card.expiresAt && <span>Expires: {card.expiresAt}</span>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {card.hasTimer && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Timer
                      </Badge>
                    )}
                    {card.hasPassword && (
                      <Badge variant="outline" className="text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        Protected
                      </Badge>
            )}
          </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="received" className="space-y-4">
          {filteredReceivedCards.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No received gift cards found</p>
              </div>
            ) : (
            filteredReceivedCards.map((card) => (
              <Card 
                key={card.tokenId} 
                className="hover:shadow-md transition-shadow cursor-pointer" 
                onClick={() => onSpendCard(card.tokenId)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
                        card.design === 'pink' ? 'from-pink-400 to-purple-500' :
                        card.design === 'blue' ? 'from-blue-400 to-cyan-500' :
                        'from-green-400 to-emerald-500'
                      } flex items-center justify-center`}>
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">${card.amount} {card.currency}</CardTitle>
                        <p className="text-sm text-gray-600">From: {card.sender.slice(0, 6)}...{card.sender.slice(-4)}</p>
                        <p className="text-xs text-gray-500">Token ID: {card.tokenId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(card.status)}>
                        {getStatusIcon(card.status)}
                        {card.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-3">"{card.message}"</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Received: {card.createdAt}</span>
                    {card.expiresAt && <span>Expires: {card.expiresAt}</span>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {card.hasTimer && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Timer
                      </Badge>
                    )}
                    {card.hasPassword && (
                      <Badge variant="outline" className="text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        Protected
                      </Badge>
            )}
          </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
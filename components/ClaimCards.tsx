import { useState, useEffect, useCallback } from 'react';
import { Gift, Clock, CheckCircle, AlertCircle, Send, Music, Instagram as InstagramIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from './ui/empty';
import { Spinner } from './ui/spinner';
import { toast } from 'sonner';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { arcTestnet } from '../utils/web3/wagmiConfig';
import web3Service from '../utils/web3/web3Service';
import { getTwitterCardMapping, claimTwitterCard, type TwitterCardMapping } from '../utils/twitter';
import { getTwitchCardMapping, claimTwitchCard, type TwitchCardMapping } from '../utils/twitch';
import { getTelegramCardMapping, claimTelegramCard, type TelegramCardMapping } from '../utils/telegram';
import { getTikTokCardMapping, claimTikTokCard, type TikTokCardMapping } from '../utils/tiktok';
import { getInstagramCardMapping, claimInstagramCard, type InstagramCardMapping } from '../utils/instagram';
import { PrivyAuthModal } from './PrivyAuthModal';

type PendingCard = (TwitterCardMapping | TwitchCardMapping | TelegramCardMapping | TikTokCardMapping | InstagramCardMapping) & {
  cardType: 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram';
};

interface ClaimCardsProps {
  onCardClaimed?: () => void;
  onPendingCountChange?: (count: number) => void;
  autoLoad?: boolean;
}

export function ClaimCards({ onCardClaimed, onPendingCountChange, autoLoad = false }: ClaimCardsProps) {
  const { authenticated, user } = usePrivy();
  const { address, isConnected } = useAccount();
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingTokenId, setClaimingTokenId] = useState<string | null>(null);
  const [isPrivyModalOpen, setIsPrivyModalOpen] = useState(false);
  const telegramAccount = (user as any)?.telegram;
  const telegramIdentifier = telegramAccount?.username || telegramAccount?.telegramUserId || telegramAccount?.id;

  const fetchPendingCards = useCallback(async () => {
    const hasTwitter = authenticated && user?.twitter?.username;
    const hasTwitch = authenticated && user?.twitch?.username;
    const hasTelegram = authenticated && Boolean(telegramIdentifier);
    const hasTikTok = authenticated && user?.tiktok?.username;
    const hasInstagram = authenticated && user?.instagram?.username;

    try {
      setLoading(true);
      const allCards: PendingCard[] = [];

      if (hasTwitter) {
        const twitterUsername = user!.twitter!.username;
        if (!twitterUsername) {
          console.warn('[ClaimCards] Twitter username not found');
          return;
        }
        console.log('[ClaimCards] Fetching pending Twitter cards for username:', twitterUsername);
        
        const tokenIds = await web3Service.getPendingTwitterCards(twitterUsername);
        console.log('[ClaimCards] Received Twitter token IDs from Vault:', tokenIds);
        
        const twitterCards = await Promise.all(
          tokenIds.map(async (tokenId) => {
            try {
              const metadata = await getTwitterCardMapping(tokenId);
              if (metadata) {
                return { ...metadata, cardType: 'twitter' as const };
              }
            } catch (error) {
              console.warn(`[ClaimCards] Failed to fetch metadata for Twitter card ${tokenId}:`, error);
              // Continue with fallback data
            }
            return {
              tokenId,
              username: twitterUsername,
              temporaryOwner: '',
              senderAddress: '',
              amount: '0',
              currency: 'USDC',
              message: '',
              metadataUri: '',
              status: 'pending' as const,
              createdAt: new Date().toISOString(),
              claimedAt: null,
              realOwner: null,
              cardType: 'twitter' as const
            };
          })
        );
        allCards.push(...twitterCards);
      }

      if (hasTwitch) {
        const twitchUsername = user!.twitch!.username;
        if (!twitchUsername) {
          console.warn('[ClaimCards] Twitch username not found');
          return;
        }
        console.log('[ClaimCards] Fetching pending Twitch cards for username:', twitchUsername);
        
        const tokenIds = await web3Service.getPendingTwitchCards(twitchUsername);
        console.log('[ClaimCards] Received Twitch token IDs from Vault:', tokenIds);
        
        const twitchCards = await Promise.all(
          tokenIds.map(async (tokenId) => {
            try {
              const metadata = await getTwitchCardMapping(tokenId);
              if (metadata) {
                return { ...metadata, cardType: 'twitch' as const };
              }
            } catch (error) {
              console.warn(`[ClaimCards] Failed to fetch metadata for Twitch card ${tokenId}:`, error);
              // Continue with fallback data
            }
            return {
              tokenId,
              username: twitchUsername,
              temporaryOwner: '',
              senderAddress: '',
              amount: '0',
              currency: 'USDC',
              message: '',
              metadataUri: '',
              status: 'pending' as const,
              createdAt: new Date().toISOString(),
              claimedAt: null,
              realOwner: null,
              cardType: 'twitch' as const
            };
          })
        );
        allCards.push(...twitchCards);
      }
      
      if (hasTelegram && telegramIdentifier) {
        const normalizedTelegramUsername = telegramIdentifier.toString().replace(/^@/, '').trim();
        if (!normalizedTelegramUsername) {
          console.warn('[ClaimCards] Telegram username not found');
        } else {
          console.log('[ClaimCards] Fetching pending Telegram cards for username:', normalizedTelegramUsername);
          
          const tokenIds = await web3Service.getPendingTelegramCards(normalizedTelegramUsername);
          console.log('[ClaimCards] Received Telegram token IDs from Vault:', tokenIds);
          
          const telegramCards = await Promise.all(
            tokenIds.map(async (tokenId) => {
              try {
                const metadata = await getTelegramCardMapping(tokenId);
                if (metadata) {
                  return { ...metadata, cardType: 'telegram' as const };
                }
              } catch (error) {
                console.warn(`[ClaimCards] Failed to fetch metadata for Telegram card ${tokenId}:`, error);
                // Continue with fallback data
              }
              return {
                tokenId,
                username: normalizedTelegramUsername,
                temporaryOwner: '',
                senderAddress: '',
                amount: '0',
                currency: 'USDC',
                message: '',
                metadataUri: '',
                status: 'pending' as const,
                createdAt: new Date().toISOString(),
                claimedAt: null,
                realOwner: null,
                cardType: 'telegram' as const
              };
            })
          );
          allCards.push(...telegramCards);
        }
      }

      if (hasTikTok) {
        const tiktokUsername = user!.tiktok!.username;
        if (!tiktokUsername) {
          console.warn('[ClaimCards] TikTok username not found');
        } else {
          const normalizedTikTokUsername = tiktokUsername.replace(/^@/, '').trim();
          console.log('[ClaimCards] Fetching pending TikTok cards for username:', normalizedTikTokUsername);

          const tokenIds = await web3Service.getPendingTikTokCards(normalizedTikTokUsername);
          console.log('[ClaimCards] Received TikTok token IDs from Vault:', tokenIds);

          const tiktokCards = await Promise.all(
            tokenIds.map(async (tokenId) => {
              try {
                const metadata = await getTikTokCardMapping(tokenId);
                if (metadata) {
                  return { ...metadata, cardType: 'tiktok' as const };
                }
              } catch (error) {
                console.warn(`[ClaimCards] Failed to fetch metadata for TikTok card ${tokenId}:`, error);
                // Continue with fallback data
              }
              return {
                tokenId,
                username: normalizedTikTokUsername,
                temporaryOwner: '',
                senderAddress: '',
                amount: '0',
                currency: 'USDC',
                message: '',
                metadataUri: '',
                status: 'pending' as const,
                createdAt: new Date().toISOString(),
                claimedAt: null,
                realOwner: null,
                cardType: 'tiktok' as const
              };
            })
          );
          allCards.push(...tiktokCards);
        }
      }

      if (hasInstagram) {
        const instagramUsername = user!.instagram!.username;
        if (!instagramUsername) {
          console.warn('[ClaimCards] Instagram username not found');
        } else {
          const normalizedInstagramUsername = instagramUsername.replace(/^@/, '').trim();
          console.log('[ClaimCards] Fetching pending Instagram cards for username:', normalizedInstagramUsername);

          const tokenIds = await web3Service.getPendingInstagramCards(normalizedInstagramUsername);
          console.log('[ClaimCards] Received Instagram token IDs from Vault:', tokenIds);

          const instagramCards = await Promise.all(
            tokenIds.map(async (tokenId) => {
              try {
                const metadata = await getInstagramCardMapping(tokenId);
                if (metadata) {
                  return { ...metadata, cardType: 'instagram' as const };
                }
              } catch (error) {
                console.warn(`[ClaimCards] Failed to fetch metadata for Instagram card ${tokenId}:`, error);
                // Continue with fallback data
              }
              return {
                tokenId,
                username: normalizedInstagramUsername,
                temporaryOwner: '',
                senderAddress: '',
                amount: '0',
                currency: 'USDC',
                message: '',
                metadataUri: '',
                status: 'pending' as const,
                createdAt: new Date().toISOString(),
                claimedAt: null,
                realOwner: null,
                cardType: 'instagram' as const
              };
            })
          );
          allCards.push(...instagramCards);
        }
      }
      
      setPendingCards(allCards);
      if (onPendingCountChange) {
        onPendingCountChange(allCards.length);
      }
    } catch (error) {
      console.error('Error fetching pending cards:', error);
      toast.error('Failed to load pending cards');
      if (onPendingCountChange) {
        onPendingCountChange(0);
      }
    } finally {
      setLoading(false);
    }
  }, [authenticated, user?.twitter?.username, user?.twitch?.username, telegramIdentifier, user?.tiktok?.username, user?.instagram?.username, onPendingCountChange]);

  useEffect(() => {
    const hasTwitter = authenticated && user?.twitter?.username;
    const hasTwitch = authenticated && user?.twitch?.username;
    const hasTelegram = authenticated && Boolean(telegramIdentifier);
    const hasTikTok = authenticated && user?.tiktok?.username;
    const hasInstagram = authenticated && user?.instagram?.username;

    if (authenticated && (hasTwitter || hasTwitch || hasTelegram || hasTikTok || hasInstagram)) {
      fetchPendingCards();
    } else {
      setPendingCards([]);
      setLoading(false);
      if (onPendingCountChange) {
        onPendingCountChange(0);
      }
    }
  }, [authenticated, user?.twitter?.username, user?.twitch?.username, telegramIdentifier, user?.tiktok?.username, user?.instagram?.username, fetchPendingCards, onPendingCountChange]);

  useEffect(() => {
    if (autoLoad && authenticated) {
      const hasTwitter = user?.twitter?.username;
      const hasTwitch = user?.twitch?.username;
      const hasTelegram = Boolean(telegramIdentifier);
      const hasTikTok = user?.tiktok?.username;
      const hasInstagram = user?.instagram?.username;
      if (hasTwitter || hasTwitch || hasTelegram || hasTikTok || hasInstagram) {
        fetchPendingCards();
      }
    }
  }, [autoLoad, authenticated, user?.twitter?.username, user?.twitch?.username, telegramIdentifier, user?.tiktok?.username, user?.instagram?.username, fetchPendingCards]);

  const handleClaim = async (card: PendingCard) => {
    if (!authenticated) {
      setIsPrivyModalOpen(true);
      const providerLabelMap = {
        twitter: 'Twitter',
        twitch: 'Twitch',
        telegram: 'Telegram',
        tiktok: 'TikTok',
        instagram: 'Instagram',
      } as const;
      const providerLabel = providerLabelMap[card.cardType] || 'Social';
      toast.info(`Please login with ${providerLabel} via Privy to claim this card`);
      return;
    }

    if (!isConnected || !address) {
      toast.error('Please connect your wallet to claim the card');
      return;
    }

    try {
      setClaimingTokenId(card.tokenId);
      
      if (card.cardType === 'twitter') {
        if (!user?.twitter) {
          setIsPrivyModalOpen(true);
          toast.info('Please login with Twitter via Privy to claim this card');
          return;
        }

        const twitterUsername = user.twitter.username;
        if (!twitterUsername) {
          throw new Error('Twitter username not found');
        }
        const normalizedLoggedIn = twitterUsername.toLowerCase().replace(/^@/, '').trim();
        const normalizedCard = card.username.toLowerCase().replace(/^@/, '').trim();
        
        if (normalizedLoggedIn !== normalizedCard) {
          throw new Error('This card is not for your Twitter account');
        }

        const walletClient = createWalletClient({
          chain: arcTestnet,
          transport: custom(window.ethereum)
        });

        await web3Service.initialize(walletClient, address);
        
        toast.info('Claiming card from vault...');
        
        const txHash = await web3Service.claimTwitterCard(
          card.tokenId,
          twitterUsername
        );

        // Update Supabase after successful blockchain transaction
        try {
          await claimTwitterCard(card.tokenId, twitterUsername, address);
          console.log('Successfully updated Supabase after claim');
        } catch (apiError) {
          console.error('Error updating Supabase after claim (non-critical):', apiError);
          // Don't fail the claim if API update fails - blockchain transaction already succeeded
        }

        toast.success(`Card claimed successfully! TX: ${txHash.slice(0, 10)}...`);
      } else if (card.cardType === 'twitch') {
        if (!user?.twitch) {
          setIsPrivyModalOpen(true);
          toast.info('Please login with Twitch via Privy to claim this card');
          return;
        }

        const twitchUsername = user.twitch.username;
        if (!twitchUsername) {
          throw new Error('Twitch username not found');
        }
        const normalizedLoggedIn = twitchUsername.toLowerCase().trim();
        const normalizedCard = card.username.toLowerCase().trim();
        
        if (normalizedLoggedIn !== normalizedCard) {
          throw new Error('This card is not for your Twitch account');
        }

        const walletClient = createWalletClient({
          chain: arcTestnet,
          transport: custom(window.ethereum)
        });

        await web3Service.initialize(walletClient, address);
        
        toast.info('Claiming card from vault...');
        
        const txHash = await web3Service.claimTwitchCard(
          card.tokenId,
          twitchUsername
        );

        // Update Supabase after successful blockchain transaction
        try {
          await claimTwitchCard(card.tokenId, twitchUsername, address);
          console.log('Successfully updated Supabase after claim');
        } catch (apiError) {
          console.error('Error updating Supabase after claim (non-critical):', apiError);
          // Don't fail the claim if API update fails - blockchain transaction already succeeded
        }

        toast.success(`Card claimed successfully! TX: ${txHash.slice(0, 10)}...`);
      } else if (card.cardType === 'telegram') {
        if (!telegramIdentifier) {
          setIsPrivyModalOpen(true);
          toast.info('Please login with Telegram via Privy to claim this card');
          return;
        }

        const telegramUsername = telegramIdentifier.toString();
        const normalizedLoggedIn = telegramUsername.toLowerCase().replace(/^@/, '').trim();
        const normalizedCard = card.username.toLowerCase().replace(/^@/, '').trim();

        if (normalizedLoggedIn !== normalizedCard) {
          throw new Error('This card is not for your Telegram account');
        }

        const walletClient = createWalletClient({
          chain: arcTestnet,
          transport: custom(window.ethereum)
        });

        await web3Service.initialize(walletClient, address);

        toast.info('Claiming card from vault...');
        
        const txHash = await web3Service.claimTelegramCard(
          card.tokenId,
          normalizedLoggedIn
        );

        // Update Supabase after successful blockchain transaction
        try {
          await claimTelegramCard(card.tokenId, normalizedLoggedIn, address);
          console.log('Successfully updated Supabase after claim');
        } catch (apiError) {
          console.error('Error updating Supabase after claim (non-critical):', apiError);
          // Don't fail the claim if API update fails - blockchain transaction already succeeded
        }

        toast.success(`Card claimed successfully! TX: ${txHash.slice(0, 10)}...`);
      } else if (card.cardType === 'tiktok') {
        if (!user?.tiktok) {
          setIsPrivyModalOpen(true);
          toast.info('Please login with TikTok via Privy to claim this card');
          return;
        }

        const tiktokUsername = user.tiktok.username;
        if (!tiktokUsername) {
          throw new Error('TikTok username not found');
        }
        const normalizedLoggedIn = tiktokUsername.toLowerCase().replace(/^@/, '').trim();
        const normalizedCard = card.username.toLowerCase().replace(/^@/, '').trim();

        if (normalizedLoggedIn !== normalizedCard) {
          throw new Error('This card is not for your TikTok account');
        }

        const walletClient = createWalletClient({
          chain: arcTestnet,
          transport: custom(window.ethereum)
        });

        await web3Service.initialize(walletClient, address);

        toast.info('Claiming card from vault...');
        
        const txHash = await web3Service.claimTikTokCard(
          card.tokenId,
          normalizedLoggedIn
        );

        // Update Supabase after successful blockchain transaction
        try {
          await claimTikTokCard(card.tokenId, normalizedLoggedIn, address);
          console.log('Successfully updated Supabase after claim');
        } catch (apiError) {
          console.error('Error updating Supabase after claim (non-critical):', apiError);
          // Don't fail the claim if API update fails - blockchain transaction already succeeded
        }

        toast.success(`Card claimed successfully! TX: ${txHash.slice(0, 10)}...`);
      } else if (card.cardType === 'instagram') {
        if (!user?.instagram) {
          setIsPrivyModalOpen(true);
          toast.info('Please login with Instagram via Privy to claim this card');
          return;
        }

        const instagramUsername = user.instagram.username;
        if (!instagramUsername) {
          throw new Error('Instagram username not found');
        }
        const normalizedLoggedIn = instagramUsername.toLowerCase().replace(/^@/, '').trim();
        const normalizedCard = card.username.toLowerCase().replace(/^@/, '').trim();

        if (normalizedLoggedIn !== normalizedCard) {
          throw new Error('This card is not for your Instagram account');
        }

        const walletClient = createWalletClient({
          chain: arcTestnet,
          transport: custom(window.ethereum)
        });

        await web3Service.initialize(walletClient, address);

        toast.info('Claiming card from vault...');
        
        const txHash = await web3Service.claimInstagramCard(
          card.tokenId,
          normalizedLoggedIn
        );

        // Update Supabase after successful blockchain transaction
        try {
          await claimInstagramCard(card.tokenId, normalizedLoggedIn, address);
          console.log('Successfully updated Supabase after claim');
        } catch (apiError) {
          console.error('Error updating Supabase after claim (non-critical):', apiError);
          // Don't fail the claim if API update fails - blockchain transaction already succeeded
        }

        toast.success(`Card claimed successfully! TX: ${txHash.slice(0, 10)}...`);
      }
      
      await fetchPendingCards();
      setClaimingTokenId(null);
      
      if (onCardClaimed) {
        onCardClaimed();
      }
    } catch (error) {
      console.error('Error claiming card:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to claim card';
      toast.error(errorMessage);
      setClaimingTokenId(null);
    }
  };

  const hasTwitter = authenticated && user?.twitter?.username;
  const hasTwitch = authenticated && user?.twitch?.username;
  const hasTelegramDisplay = authenticated && Boolean(telegramIdentifier);
  const hasTikTokDisplay = authenticated && user?.tiktok?.username;
  const hasInstagramDisplay = authenticated && user?.instagram?.username;

  if (!authenticated || (!hasTwitter && !hasTwitch && !hasTelegramDisplay && !hasTikTokDisplay && !hasInstagramDisplay)) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please login with Twitter, Twitch, Telegram, TikTok or Instagram via Privy to see and claim gift cards sent to your username.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => setIsPrivyModalOpen(true)}>
            Login with Privy
          </Button>
        </div>
        <PrivyAuthModal 
          isOpen={isPrivyModalOpen} 
          onClose={() => setIsPrivyModalOpen(false)} 
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center gap-2">
        <Spinner className="w-6 h-6 text-gray-400" />
        <span className="text-gray-600">Loading pending cards...</span>
      </div>
    );
  }

  if (pendingCards.length === 0) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Gift className="w-16 h-16 text-gray-400" />
            </EmptyMedia>
            <EmptyTitle>No Pending Cards</EmptyTitle>
            <EmptyDescription>
              You don't have any gift cards waiting to be claimed.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const usernames = [];
  if (hasTwitter) usernames.push(`@${user!.twitter!.username}`);
  if (hasTwitch) usernames.push(`${user!.twitch!.username} (Twitch)`);
  if (hasTelegramDisplay && telegramIdentifier) usernames.push(`@${telegramIdentifier.toString().replace(/^@/, '')} (Telegram)`);
  if (hasTikTokDisplay) usernames.push(`@${user!.tiktok!.username?.replace(/^@/, '')} (TikTok)`);
  if (hasInstagramDisplay) usernames.push(`@${user!.instagram!.username?.replace(/^@/, '')} (Instagram)`);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">🎁 Pending Gift Cards ({pendingCards.length})</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gift cards sent to {usernames.join(' and ')}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {pendingCards.map((card) => (
          <Card key={`${card.cardType}-${card.tokenId}`} className="relative">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        card.cardType === 'twitter'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : card.cardType === 'twitch'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : card.cardType === 'telegram'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : card.cardType === 'tiktok'
                          ? 'bg-black text-white border-black'
                          : 'bg-pink-50 text-pink-600 border-pink-200'
                      }
                    >
                      {card.cardType === 'twitter' ? (
                        <>
                          <svg viewBox="0 0 24 24" fill="currentColor" className="size-3">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          X.com
                        </>
                      ) : card.cardType === 'twitch' ? (
                        //https://brandfetch.com/twitch.tv?library=default&collection=logos&asset=idkW5NfuSd
                        <>
                          <svg viewBox="0 0 24 24" fill="currentColor" className="size-3">
                            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                          </svg>
                          Twitch
                        </>
                      ) : card.cardType === 'telegram' ? (
                        <>
                          <Send className="w-3 h-3" />
                          Telegram
                        </>
                      ) : card.cardType === 'tiktok' ? (
                        <>
                          <Music className="w-3 h-3" />
                          TikTok
                        </>
                      ) : (
                        <>
                          <InstagramIcon className="w-3 h-3" />
                          Instagram
                        </>
                      )}
                    </Badge>
                    <span className="text-sm text-gray-500">Card #{card.tokenId}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">${card.amount}</span>
                      <span className="text-sm text-gray-500">{card.currency}</span>
                    </div>
                    
                    {card.message && (
                      <p className="text-gray-700 italic">"{card.message}"</p>
                    )}
                    
                    <div className="text-sm text-gray-500">
                      From: {card.senderAddress.slice(0, 6)}...{card.senderAddress.slice(-4)}
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      Created: {new Date(card.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <Button
                    onClick={() => handleClaim(card)}
                    disabled={claimingTokenId === card.tokenId || !isConnected}
                    className="min-w-[120px]"
                  >
                    {claimingTokenId === card.tokenId ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Claim Card
                      </>
                    )}
                  </Button>
                  
                  {!isConnected && (
                    <span className="text-xs text-gray-500">Connect wallet</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PrivyAuthModal 
        isOpen={isPrivyModalOpen} 
        onClose={() => setIsPrivyModalOpen(false)} 
      />
    </div>
  );
}


import { useState, useEffect } from 'react';
import { Gift, Clock, CheckCircle, AlertCircle } from 'lucide-react';
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
import { getTwitchCardMapping, type TwitchCardMapping } from '../utils/twitch';
import { PrivyAuthModal } from './PrivyAuthModal';

export function ClaimTwitchCards() {
  const { authenticated, user } = usePrivy();
  const { address, isConnected } = useAccount();
  const [pendingCards, setPendingCards] = useState<TwitchCardMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingTokenId, setClaimingTokenId] = useState<string | null>(null);
  const [isPrivyModalOpen, setIsPrivyModalOpen] = useState(false);

  useEffect(() => {
    if (authenticated && user?.twitch?.username) {
      fetchPendingCards();
    } else {
      setPendingCards([]);
      setLoading(false);
    }
  }, [authenticated, user?.twitch?.username]);

  const fetchPendingCards = async () => {
    if (!user?.twitch?.username) return;

    try {
      setLoading(true);
      const username = user.twitch.username;
      console.log('[ClaimTwitchCards] Fetching pending cards for username:', username);
      
      const tokenIds = await web3Service.getPendingTwitchCards(username);
      console.log('[ClaimTwitchCards] Received token IDs from Vault:', tokenIds);
      
      const cardsWithMetadata = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const metadata = await getTwitchCardMapping(tokenId);
          if (metadata) {
            return metadata;
          }
          return {
            tokenId,
            username,
            temporaryOwner: '',
            senderAddress: '',
            amount: '0',
            currency: 'USDC',
            message: '',
            metadataUri: '',
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
            claimedAt: null,
            realOwner: null
          };
        })
      );
      
      setPendingCards(cardsWithMetadata);
    } catch (error) {
      console.error('Error fetching pending Twitch cards:', error);
      toast.error('Failed to load pending cards');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (card: TwitchCardMapping) => {
    if (!authenticated || !user?.twitch) {
      setIsPrivyModalOpen(true);
      toast.info('Please login with Twitch via Privy to claim this card');
      return;
    }

    if (!isConnected || !address) {
      toast.error('Please connect your wallet to claim the card');
      return;
    }

    try {
      setClaimingTokenId(card.tokenId);
      
      const twitchUsername = user.twitch.username;
      if (!twitchUsername) {
        throw new Error('Twitch username not found');
      }
      
      const normalizedLoggedIn = twitchUsername.toLowerCase().trim();
      const normalizedCard = card.username.toLowerCase().trim();
      
      if (normalizedLoggedIn !== normalizedCard) {
        throw new Error('This card is not for your Twitch account');
      }

      if (!address) {
        throw new Error('No wallet address found. Please connect your wallet.');
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

      toast.success(`Card claimed successfully! TX: ${txHash.slice(0, 10)}...`);
      
      await fetchPendingCards();
      setClaimingTokenId(null);
    } catch (error) {
      console.error('Error claiming Twitch card:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to claim card';
      toast.error(errorMessage);
      setClaimingTokenId(null);
    }
  };

  if (!authenticated || !user?.twitch) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please login with Twitch via Privy to see and claim gift cards sent to your Twitch username.
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Pending Gift Cards ({pendingCards.length})</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gift cards sent to <strong>{user.twitch.username}</strong>
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {pendingCards.map((card) => (
          <Card key={card.tokenId} className="relative">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
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





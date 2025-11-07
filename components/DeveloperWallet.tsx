import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useWalletClient } from 'wagmi';
import { toast } from 'sonner';
import { createWalletClient, custom } from 'viem';
import { arcTestnet } from '../utils/web3/wagmiConfig';
import { DeveloperWalletService, DeveloperWallet } from '../utils/circle/developerWalletService';
import web3Service from '../utils/web3/web3Service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Loader2, Wallet, Copy, Check, ExternalLink, ArrowUpCircle, ChevronUp, ChevronDown, Info, Coins, Send } from 'lucide-react';

interface DeveloperWalletProps {
  blockchain?: string;
  onWalletCreated?: (wallet: DeveloperWallet) => void;
}

export function DeveloperWalletComponent({ blockchain = 'ARC-TESTNET', onWalletCreated }: DeveloperWalletProps) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { user: privyUser } = usePrivy();
  const [wallet, setWallet] = useState<DeveloperWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [copied, setCopied] = useState(false);
  const [topUpToken, setTopUpToken] = useState<'USDC' | 'EURC'>('USDC');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [requestingTokens, setRequestingTokens] = useState(false);
  const [linkingTelegram, setLinkingTelegram] = useState(false);

  const isValidTelegramId = (value: string | null | undefined) => {
    if (!value) return false;
    return /^-?\d+$/.test(value.trim());
  };

  const resolveTelegramUserId = (): string | null => {
    if (typeof window !== 'undefined') {
      const telegramUser = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
      if (telegramUser?.id && isValidTelegramId(String(telegramUser.id))) {
        return String(telegramUser.id);
      }
    }

    const privyTelegramId =
      (privyUser as any)?.telegram?.telegramUserId ||
      (privyUser as any)?.telegram?.id ||
      (privyUser as any)?.telegram?.subject;

    if (isValidTelegramId(privyTelegramId)) {
      return String(privyTelegramId);
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage?.getItem('sendly:lastTelegramId');
        if (isValidTelegramId(stored)) {
          return stored as string;
        }
      } catch (error) {
        console.warn('Failed to read stored Telegram ID:', error);
      }
    }

    return null;
  };

  const getPrivyUserId = (): string | undefined => {
    const candidate =
      (privyUser as any)?.id ||
      (privyUser as any)?.userId ||
      (privyUser as any)?.subject ||
      (privyUser as any)?.sub;
    return candidate ? String(candidate) : undefined;
  };

  useEffect(() => {
    if (isConnected && address) {
      checkWallet();
    } else {
      setChecking(false);
    }
  }, [isConnected, address, blockchain]);

  const checkWallet = async () => {
    if (!address) return;
    
    try {
      setChecking(true);
      const wallets = await DeveloperWalletService.getWallets(address);
      const existingWallet = wallets.find(w => w.blockchain === blockchain);
      setWallet(existingWallet || null);
    } catch (error) {
      console.error('Error checking wallet:', error);
      toast.error('Failed to check wallet');
    } finally {
      setChecking(false);
    }
  };

  const createWallet = async () => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      const response = await DeveloperWalletService.createWallet({
        userId: address,
        blockchain: blockchain,
        accountType: 'EOA'
      });

      if (response.success && response.wallet) {
        setWallet(response.wallet);
        toast.success('Wallet created successfully!');
        if (onWalletCreated) {
          onWalletCreated(response.wallet);
        }
      } else {
        toast.error(response.message || 'Failed to create wallet');
      }
    } catch (error: any) {
      console.error('Error creating wallet:', error);
      const errorMessage = error?.message || 'Unknown error';
      toast.error(`Error creating wallet: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = async () => {
    if (!wallet?.wallet_address) return;
    
    try {
      await navigator.clipboard.writeText(wallet.wallet_address);
      setCopied(true);
      toast.success('Address copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy address');
    }
  };

  const getBlockchainName = (blockchain: string) => {
    const names: Record<string, string> = {
      'ARC-TESTNET': 'Arc Testnet',
      'ETH-SEPOLIA': 'Ethereum Sepolia',
      'BASE-SEPOLIA': 'Base Sepolia',
      'MATIC-AMOY': 'Polygon Amoy',
      'SOL-DEVNET': 'Solana Devnet'
    };
    return names[blockchain] || blockchain;
  };

  const getExplorerUrl = (blockchain: string, address: string) => {
    const urls: Record<string, string> = {
      'ARC-TESTNET': `https://testnet.arcscan.app/address/${address}`,
      'ETH-SEPOLIA': `https://sepolia.etherscan.io/address/${address}`,
      'BASE-SEPOLIA': `https://sepolia.basescan.org/address/${address}`,
      'MATIC-AMOY': `https://amoy.polygonscan.com/address/${address}`,
      'SOL-DEVNET': `https://explorer.solana.com/address/${address}?cluster=devnet`
    };
    return urls[blockchain] || '#';
  };

  const getTransactionUrl = (blockchain: string, txHash: string) => {
    const urls: Record<string, string> = {
      'ARC-TESTNET': `https://testnet.arcscan.app/tx/${txHash}`,
      'ETH-SEPOLIA': `https://sepolia.etherscan.io/tx/${txHash}`,
      'BASE-SEPOLIA': `https://sepolia.basescan.org/tx/${txHash}`,
      'MATIC-AMOY': `https://amoy.polygonscan.com/tx/${txHash}`,
      'SOL-DEVNET': `https://explorer.solana.com/tx/${txHash}?cluster=devnet`
    };
    return urls[blockchain] || '#';
  };

  const handleTopUp = async () => {
    if (!wallet?.wallet_address || !address || !isConnected) {
      toast.error('Wallet not available');
      return;
    }

    if (!topUpAmount || parseFloat(topUpAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setTopUpLoading(true);

      // Initialize web3 service
      let clientToUse = walletClient;
      if (!clientToUse) {
        clientToUse = createWalletClient({
          chain: arcTestnet,
          transport: custom(window.ethereum)
        });
      }

      await web3Service.initialize(clientToUse, address);

      // Send tokens to developer wallet
      const txHash = await web3Service.sendToken(
        topUpToken,
        wallet.wallet_address,
        topUpAmount
      );

      toast.success(`Successfully sent ${topUpAmount} ${topUpToken} to developer wallet!`);
      setTopUpAmount('');
      
      // Open transaction in explorer
      const txUrl = getTransactionUrl(wallet.blockchain, txHash);
      if (txUrl !== '#') {
        window.open(txUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Error topping up wallet:', error);
      toast.error(error?.message || 'Failed to send tokens');
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleRequestTestnetTokens = async () => {
    if (!wallet?.wallet_address) {
      toast.error('Wallet not available');
      return;
    }

    // Check if blockchain is a testnet
    const testnetBlockchains = ['ARC-TESTNET', 'ETH-SEPOLIA', 'BASE-SEPOLIA', 'MATIC-AMOY', 'OP-SEPOLIA', 'ARB-SEPOLIA', 'AVAX-FUJI', 'SOL-DEVNET', 'UNI-SEPOLIA'];
    if (!testnetBlockchains.includes(wallet.blockchain)) {
      toast.error('Testnet tokens can only be requested for testnet blockchains');
      return;
    }

    try {
      setRequestingTokens(true);
      
      const response = await DeveloperWalletService.requestTestnetTokens(
        wallet.wallet_address,
        wallet.blockchain
      );

      if (response.success) {
        toast.success('Testnet tokens requested! USDC and EURC will be sent to your wallet shortly.');
      } else {
        toast.error(response.message || 'Failed to request testnet tokens');
      }
    } catch (error: any) {
      console.error('Error requesting testnet tokens:', error);
      toast.error(error?.message || 'Failed to request testnet tokens');
    } finally {
      setRequestingTokens(false);
    }
  };

  const handleLinkTelegram = async () => {
    if (!wallet?.wallet_address || !address || !isConnected) {
      toast.error('Wallet not available');
      return;
    }

    let telegramUserId = resolveTelegramUserId();

    if (!telegramUserId) {
      const manualId = typeof window !== 'undefined' ? window.prompt('Enter the Telegram ID from the Telegram WebApp') : null;
      if (!manualId) {
        toast.error('Telegram ID not found');
        return;
      }

      if (!isValidTelegramId(manualId)) {
        toast.error('Please enter a valid numeric Telegram ID');
        return;
      }

      telegramUserId = manualId.trim();
    }

    try {
      setLinkingTelegram(true);

      const timestamp = new Date().toISOString();
      const messageToSign = `I authorize linking my Internal wallet ${wallet.wallet_address.toLowerCase()} to Telegram user ${telegramUserId} at ${timestamp}`;

      let signer = walletClient;
      if (!signer) {
        if (typeof window === 'undefined' || !(window as any).ethereum) {
          toast.error('Ethereum provider not found for signing');
          setLinkingTelegram(false);
          return;
        }
        signer = createWalletClient({
          chain: arcTestnet,
          transport: custom((window as any).ethereum)
        });
      }

      const signature = await (signer as any).signMessage({
        account: address as `0x${string}`,
        message: messageToSign
      });

      const response = await DeveloperWalletService.linkTelegram({
        walletAddress: wallet.wallet_address,
        blockchain: wallet.blockchain,
        telegramUserId,
        signature,
        message: messageToSign,
        privyUserId: getPrivyUserId(),
        validateTelegram: Boolean((privyUser as any)?.telegram)
      });

      if (response.success && response.wallet) {
        setWallet(response.wallet);
        toast.success('Telegram ID linked to wallet successfully');
        if (typeof window !== 'undefined') {
          try {
            window.localStorage?.setItem('sendly:lastTelegramId', telegramUserId);
          } catch (error) {
            console.warn('Failed to persist Telegram ID:', error);
          }
        }
      } else {
        toast.error(response.error || response.details || response.message || 'Failed to link Telegram ID');
      }
    } catch (error: any) {
      console.error('Error linking Telegram ID:', error);
      const errorMessage = error?.message || 'Failed to link Telegram ID';
      toast.error(errorMessage);
    } finally {
      setLinkingTelegram(false);
    }
  };

  if (!isConnected || !address) {
    return null;
  }

  if (checking) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-circle-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Checking wallet...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (wallet) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-circle-card">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50 border border-green-100">
                  <Wallet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Internal Wallet</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Developer-controlled wallet
                  </CardDescription>
                </div>
              </div>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          
          <CollapsibleContent>
            <CardContent className="space-y-5 pt-0">
              {/* Wallet Address Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Wallet Address</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAddress}
                    className="h-7 px-2 text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-gradient-to-r from-gray-50 to-gray-50/50 p-3.5 rounded-lg border border-gray-200 font-mono text-xs break-all leading-relaxed">
                  {wallet.wallet_address}
                </div>
              </div>

              <Separator />

              {/* Wallet Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Blockchain</p>
                  <Badge variant="outline" className="font-normal">
                    {getBlockchainName(wallet.blockchain)}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Type</p>
                  <Badge variant="outline" className="font-normal">
                    {wallet.account_type}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
                  <Badge 
                    variant={wallet.state === 'LIVE' ? 'default' : 'destructive'}
                    className="font-normal"
                  >
                    {wallet.state === 'LIVE' ? 'Active' : 'Frozen'}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</p>
                  <p className="text-sm font-medium text-gray-900">
                    {wallet.created_at ? new Date(wallet.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : '-'}
                  </p>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Telegram</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={wallet.telegram_user_id ? 'default' : 'outline'}
                      className={wallet.telegram_user_id ? 'font-normal bg-sky-100 text-sky-800 border-sky-200' : 'font-normal'}
                    >
                      {wallet.telegram_user_id ? 'Linked' : 'Not linked'}
                    </Badge>
                    {wallet.telegram_user_id && (
                      <span className="text-xs text-gray-600 break-all">
                        ID: {wallet.telegram_user_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(getExplorerUrl(wallet.blockchain, wallet.wallet_address), '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Explorer
                </Button>
                <Button
                  onClick={handleLinkTelegram}
                  disabled={linkingTelegram}
                  className="flex-1"
                >
                  {linkingTelegram ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {wallet.telegram_user_id ? 'Relink TG' : 'Link TG'}
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              {/* Top Up Section */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Top Up Wallet</h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Fund your wallet with USDC or EURC tokens
                  </p>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Select value={topUpToken} onValueChange={(value) => setTopUpToken(value as 'USDC' | 'EURC')}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USDC">USDC</SelectItem>
                          <SelectItem value="EURC">EURC</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        min="0"
                        step="0.01"
                        className="flex-1"
                      />
                    </div>
                    <Button
                      onClick={handleTopUp}
                      disabled={topUpLoading || !topUpAmount || parseFloat(topUpAmount) <= 0}
                      className="w-full"
                    >
                      {topUpLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <ArrowUpCircle className="w-4 h-4 mr-2" />
                          Top Up Wallet
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleRequestTestnetTokens}
                      disabled={requestingTokens}
                      variant="outline"
                      className="w-full"
                    >
                      {requestingTokens ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Requesting...
                        </>
                      ) : (
                        <>
                          <Coins className="w-4 h-4 mr-2" />
                          Request Testnet Tokens
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Info Alert */}
                <div className="flex gap-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-900 leading-relaxed">
                    This wallet is developer-controlled. You can fund it from your EVM wallet and use it for transactions through the Telegram bot without MetaMask signing.
                  </p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-circle-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
           Internal Wallet
        </CardTitle>
        <CardDescription>
          To use AI Agents functionality via Telegram, please create an internal wallet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Why is this needed?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Send transactions through the Telegram bot</li>
            <li>• No need to sign each transaction</li>
            <li>• Design a flexible flow for your funds</li>
            <li>• Assign tasks to the agent with</li>
          </ul>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Blockchain:</span>
            <span className="font-medium">{getBlockchainName(blockchain)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Account type:</span>
            <span className="font-medium">EOA (Externally Owned Account)</span>
          </div>
        </div>

        <Button
          onClick={createWallet}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating wallet...
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4 mr-2" />
              Create wallet
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          The wallet will be created on {getBlockchainName(blockchain)} blockchain and linked to your EVM address and Telegram
        </p>
      </CardContent>
    </Card>
  );
}


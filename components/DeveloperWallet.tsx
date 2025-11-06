import { useState, useEffect } from 'react';
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
import { Loader2, Wallet, Copy, Check, ExternalLink, ArrowUpCircle, ChevronUp, ChevronDown, Info, Coins } from 'lucide-react';

interface DeveloperWalletProps {
  blockchain?: string;
  onWalletCreated?: (wallet: DeveloperWallet) => void;
}

export function DeveloperWalletComponent({ blockchain = 'ARC-TESTNET', onWalletCreated }: DeveloperWalletProps) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [wallet, setWallet] = useState<DeveloperWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [copied, setCopied] = useState(false);
  const [topUpToken, setTopUpToken] = useState<'USDC' | 'EURC'>('USDC');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [requestingTokens, setRequestingTokens] = useState(false);

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

  if (!isConnected || !address) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-circle-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Developer-Controlled Wallet
          </CardTitle>
          <CardDescription>
            Connect MetaMask to create an internal wallet
          </CardDescription>
        </CardHeader>
      </Card>
    );
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
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(getExplorerUrl(wallet.blockchain, wallet.wallet_address), '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Explorer
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
          Create Developer-Controlled Wallet
        </CardTitle>
        <CardDescription>
          Create an internal wallet to send transactions through the Telegram bot without MetaMask signing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Why is this needed?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Send transactions through the Telegram bot</li>
            <li>• No need to sign each transaction in MetaMask</li>
            <li>• Fund from a regular wallet</li>
            <li>• Manage wallet through API</li>
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
          The wallet will be created on {getBlockchainName(blockchain)} blockchain and linked to your MetaMask address
        </p>
      </CardContent>
    </Card>
  );
}


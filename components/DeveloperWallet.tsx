import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { DeveloperWalletService, DeveloperWallet } from '../utils/circle/developerWalletService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Loader2, Wallet, Copy, Check, ExternalLink } from 'lucide-react';

interface DeveloperWalletProps {
  blockchain?: string;
  onWalletCreated?: (wallet: DeveloperWallet) => void;
}

export function DeveloperWalletComponent({ blockchain = 'ARC-TESTNET', onWalletCreated }: DeveloperWalletProps) {
  const { address, isConnected } = useAccount();
  const [wallet, setWallet] = useState<DeveloperWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [copied, setCopied] = useState(false);

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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-500" />
            Developer-Controlled Wallet
          </CardTitle>
          <CardDescription>
            Your internal wallet on {getBlockchainName(wallet.blockchain)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Wallet address:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="h-8 px-2"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm break-all">
              {wallet.wallet_address}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Blockchain:</span>
              <div className="font-medium">{getBlockchainName(wallet.blockchain)}</div>
            </div>
            <div>
              <span className="text-gray-600">Account type:</span>
              <div className="font-medium">{wallet.account_type}</div>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <div className={`font-medium ${wallet.state === 'LIVE' ? 'text-green-600' : 'text-red-600'}`}>
                {wallet.state === 'LIVE' ? 'Active' : 'Frozen'}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Created:</span>
              <div className="font-medium">
                {wallet.created_at ? new Date(wallet.created_at).toLocaleDateString('en-US') : '-'}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(getExplorerUrl(wallet.blockchain, wallet.wallet_address), '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Explorer
            </Button>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500">
              💡 This wallet is developer-controlled. You can fund it from your MetaMask wallet and use it for transactions through the Telegram bot.
            </p>
          </div>
        </CardContent>
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


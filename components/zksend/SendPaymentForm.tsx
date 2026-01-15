import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { toast } from 'sonner';

import web3Service from '../../utils/web3/web3Service';
import { generateSocialIdentityHash } from '../../utils/reclaim/identity';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function SendPaymentForm() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [platform, setPlatform] = useState<'twitter' | 'telegram' | 'instagram' | 'tiktok'>('twitter');
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenType, setTokenType] = useState<'USDC' | 'EURC'>('USDC');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      if (!isConnected || !address || !walletClient) {
        throw new Error('Connect wallet to create payment');
      }
      if (!username.trim()) throw new Error('Enter username');
      if (!amount || Number(amount) <= 0) throw new Error('Enter amount > 0');

      setLoading(true);
      await web3Service.initialize(walletClient, address);

      const socialIdentityHash = generateSocialIdentityHash(platform, username.replace(/^@/, '').trim());
      const { paymentId, txHash } = await web3Service.createZkSendPayment({
        socialIdentityHash,
        platform,
        amount,
        tokenType,
      });

      toast.success(
        paymentId ? `Payment created. paymentId=${paymentId}` : `Payment created. TX: ${txHash.slice(0, 10)}...`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create payment';
      console.error('[zkSEND] createPayment error:', e);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create zkSEND Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twitter">Twitter / X</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" />
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10" />
          </div>

          <div className="space-y-2">
            <Label>Token</Label>
            <Select value={tokenType} onValueChange={(v) => setTokenType(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="EURC">EURC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={onSubmit} disabled={loading}>
          {loading ? 'Creating...' : 'Create Payment'}
        </Button>
      </CardContent>
    </Card>
  );
}


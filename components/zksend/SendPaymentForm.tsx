import { useMemo, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { toast } from 'sonner';

import web3Service from '../../utils/web3/web3Service';
import {
  generateSocialIdentityHash,
  normalizeSocialPlatform,
  normalizeSocialUsername,
} from '../../utils/reclaim/identity';
import { createZkSendPaymentRecord } from '../../utils/zksend/zksendPaymentsAPI';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';

import type { ZkSendPlatform } from './ZkSendPanel';

type Props = {
  platform: ZkSendPlatform;
  username: string;
  isIdentityValid: boolean;
  onGoToPending?: () => void;
};

export function SendPaymentForm({ platform, username, isIdentityValid, onGoToPending }: Props) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [amount, setAmount] = useState('');
  const [tokenType, setTokenType] = useState<'USDC' | 'EURC'>('USDC');
  const [loading, setLoading] = useState(false);

  const normalizedUsername = useMemo(() => normalizeSocialUsername(username.replace(/^@/, '')), [username]);
  const normalizedPlatform = useMemo(() => normalizeSocialPlatform(platform), [platform]);

  const onSubmit = async () => {
    try {
      if (!isConnected || !address || !walletClient) {
        throw new Error('Connect wallet to create payment');
      }
      if (!normalizedUsername) throw new Error('Enter username');
      if (!amount || Number(amount) <= 0) throw new Error('Enter amount > 0');

      setLoading(true);
      await web3Service.initialize(walletClient, address);

      if (!normalizedPlatform) throw new Error('Unsupported platform');
      const socialIdentityHash = generateSocialIdentityHash(normalizedPlatform, normalizedUsername);
      if (!socialIdentityHash) throw new Error('Invalid social identity');
      const { paymentId, txHash } = await web3Service.createZkSendPayment({
        socialIdentityHash,
        platform: normalizedPlatform,
        amount,
        tokenType,
      });

      if (paymentId) {
        try {
          await createZkSendPaymentRecord({
            paymentId,
            senderAddress: address,
            recipientIdentityHash: socialIdentityHash,
            platform: normalizedPlatform,
            amount,
            currency: tokenType,
            txHash,
          });
        } catch (dbError) {
          console.warn('[zkSEND] Failed to store payment in DB:', dbError);
        }
      } else {
        console.warn('[zkSEND] Payment created without paymentId; DB record was not stored.');
      }

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

  const canSubmit = isIdentityValid && amount && Number(amount) > 0 && isConnected && !!address && !!walletClient;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Amount</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Amount"
              className="sm:flex-1"
              disabled={!isIdentityValid}
            />
            <ToggleGroup
              type="single"
              value={tokenType}
              onValueChange={(v) => (v ? setTokenType(v as 'USDC' | 'EURC') : null)}
              variant="outline"
              className="w-full sm:w-[220px]"
              aria-label="Token"
              disabled={!isIdentityValid}
            >
              <ToggleGroupItem value="USDC" aria-label="USDC">
                USDC
              </ToggleGroupItem>
              <ToggleGroupItem value="EURC" aria-label="EURC">
                EURC
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="text-xs text-muted-foreground">Example: 10 {tokenType}</div>
        </div>

        {!isIdentityValid && (
          <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            Please select platform and enter username above to create a payment
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
          <Button
            onClick={onSubmit}
            disabled={!canSubmit || loading}
            size="lg"
            className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-600/90 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create payment'}
          </Button>

          {onGoToPending ? (
            <Button type="button" variant="ghost" onClick={onGoToPending} className="w-full sm:w-auto">
              View pending payments
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}


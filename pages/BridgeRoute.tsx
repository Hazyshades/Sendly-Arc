import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import BridgeDialog from '../components/BridgeDialog';
import { getChainBySlug, getChainByChainId, getTokenByAddress } from '../utils/bridge/bridgeConfig';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

export function BridgeRoute() {
  const { chainSlug } = useParams<{ chainSlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  const toCurrency = searchParams.get('toCurrency');
  const fromChainIdParam = searchParams.get('fromChainId');
  const fromCurrency = searchParams.get('fromCurrency');
  const amount = searchParams.get('amount');

  useEffect(() => {
    if (!chainSlug) {
      setError('Target network not specified');
      return;
    }

    const toChain = getChainBySlug(chainSlug);
    if (!toChain) {
      setError(`Network "${chainSlug}" not found or not supported`);
      return;
    }

    if (fromChainIdParam) {
      const fromChainId = Number(fromChainIdParam);
      if (isNaN(fromChainId)) {
        setError(`Invalid source network chainId: ${fromChainIdParam}`);
        return;
      }

      const fromChain = getChainByChainId(fromChainId);
      if (!fromChain) {
        setError(`Source network with chainId ${fromChainId} is not supported`);
        return;
      }

      if (fromChain.chainId === toChain.chainId) {
        setError('Source and target networks cannot be the same');
        return;
      }
    }

    if (toCurrency && fromCurrency) {
      if (!fromChainIdParam) {
        setError('fromChainId must be specified when using token addresses');
        return;
      }

      const fromChainId = Number(fromChainIdParam);
      const fromToken = getTokenByAddress(fromCurrency, fromChainId);
      const toToken = getTokenByAddress(toCurrency, toChain.chainId);

      if (!fromToken) {
        setError(`Token with address ${fromCurrency} not found in source network`);
        return;
      }

      if (!toToken) {
        setError(`Token with address ${toCurrency} not found in target network`);
        return;
      }

      if (fromToken.symbol !== toToken.symbol) {
        setError(`Tokens do not match: ${fromToken.symbol} ≠ ${toToken.symbol}`);
        return;
      }
    }

    setError(null);
  }, [chainSlug, fromChainIdParam, fromCurrency, toCurrency]);

  const toChain = chainSlug ? getChainBySlug(chainSlug) : null;
  const fromChainId = fromChainIdParam ? Number(fromChainIdParam) : undefined;

  let tokenSymbol: 'USDC' | 'EURC' | undefined = undefined;
  if (fromCurrency && fromChainId) {
    const fromToken = getTokenByAddress(fromCurrency, fromChainId);
    if (fromToken && (fromToken.symbol === 'USDC' || fromToken.symbol === 'EURC')) {
      tokenSymbol = fromToken.symbol as 'USDC' | 'EURC';
    }
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate('/')}>Return to home</Button>
        </div>
      </div>
    );
  }

  if (!toChain) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Loading...</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <BridgeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onBridgeComplete={() => {
          setIsDialogOpen(false);
          setTimeout(() => navigate('/'), 2000);
        }}
        initialAmount={amount || undefined}
        fromChainId={fromChainId}
        toChainId={toChain.chainId}
        fromCurrency={fromCurrency || undefined}
        toCurrency={toCurrency || undefined}
        tokenSymbol={tokenSymbol}
      />
      {!isDialogOpen && (
        <div className="text-center mt-4">
          <Button onClick={() => navigate('/')}>Return to home</Button>
        </div>
      )}
    </div>
  );
}

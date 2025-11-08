import { useState, useEffect } from 'react';
import { Gift, QrCode, Share2, Clock, Lock, Upload, Palette, CheckCircle, AlertCircle, ExternalLink, Mail, MessageCircle, Copy, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
 
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { toast } from 'sonner';
import { useAccount, useWalletClient } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { arcTestnet } from '../utils/web3/wagmiConfig';
import web3Service from '../utils/web3/web3Service';
import pinataService from '../utils/pinata';
import imageGenerator from '../utils/imageGenerator';
import { createTwitterCardMapping } from '../utils/twitter';
import { createTwitchCardMapping } from '../utils/twitch';
import { createTelegramCardMapping } from '../utils/telegram';
import { createTikTokCardMapping } from '../utils/tiktok';
import { createInstagramCardMapping } from '../utils/instagram';
import BridgeDialog from './BridgeDialog';
import { GiftCardsService } from '../utils/supabase/giftCards';
import { useNavigate } from 'react-router-dom';
import { generateBridgeUrlFromArc } from '../utils/bridge/bridgeUrlHelper';

interface GiftCardData {
  recipientType: 'address' | 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram';
  recipientAddress: string;
  recipientUsername: string;
  amount: string;
  currency: 'USDC' | 'EURC';
  design: 'pink' | 'blue' | 'green' | 'custom';
  message: string;
  secretMessage: string;
  hasTimer: boolean;
  timerHours: number;
  hasPassword: boolean;
  password: string;
  expiryDays: number;
  customImage: string;
  nftCover: string;
}

const SOCIAL_RECIPIENT_OPTIONS = [
  { value: 'twitter', label: 'Twitter username' },
  { value: 'twitch', label: 'Twitch username' },
  { value: 'telegram', label: 'Telegram username' },
  { value: 'tiktok', label: 'TikTok username' },
  { value: 'instagram', label: 'Instagram username' }
] as const;

export function CreateGiftCard() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<GiftCardData>({
    recipientType: 'address',
    recipientAddress: '',
    recipientUsername: '',
    amount: '1',
    currency: 'USDC',
    design: 'pink',
    message: '',
    secretMessage: '',
    hasTimer: false,
    timerHours: 24,
    hasPassword: false,
    password: '',
    expiryDays: 365,
    customImage: '',
    nftCover: ''
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdCard, setCreatedCard] = useState<any>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'generating' | 'uploading' | 'creating' | 'success'>('form');
  const [isBridgeDialogOpen, setIsBridgeDialogOpen] = useState(false);
  const [highlightField, setHighlightField] = useState<'twitch' | 'twitter' | 'telegram' | 'tiktok' | 'instagram' | null>(null);
  const [isSocialsOpen, setIsSocialsOpen] = useState(formData.recipientType !== 'address');

  // Load selected recipient from localStorage on mount
  useEffect(() => {
    const selectedRecipient = localStorage.getItem('selectedGiftCardRecipient');
    if (selectedRecipient) {
      try {
        const recipient = JSON.parse(selectedRecipient);
        if (recipient.type === 'twitch' && recipient.username) {
          setFormData(prev => ({
            ...prev,
            recipientType: 'twitch',
            recipientUsername: recipient.username
          }));
          // Highlight the field
          setHighlightField('twitch');
          toast.success(`Selected ${recipient.displayName || recipient.username} for gift card`);
          // Clear the stored recipient after using it
          localStorage.removeItem('selectedGiftCardRecipient');
          // Remove highlight after animation
          setTimeout(() => setHighlightField(null), 2000);
        } else if (recipient.type === 'twitter' && recipient.username) {
          setFormData(prev => ({
            ...prev,
            recipientType: 'twitter',
            recipientUsername: recipient.username
          }));
          // Highlight the field
          setHighlightField('twitter');
          toast.success(`Selected ${recipient.displayName || recipient.username} for gift card`);
          localStorage.removeItem('selectedGiftCardRecipient');
          // Remove highlight after animation
          setTimeout(() => setHighlightField(null), 2000);
        } else if (recipient.type === 'telegram' && recipient.username) {
          setFormData(prev => ({
            ...prev,
            recipientType: 'telegram',
            recipientUsername: recipient.username.replace(/^@/, '')
          }));
          setHighlightField('telegram');
          toast.success(`Selected ${recipient.displayName || recipient.username} for gift card`);
          localStorage.removeItem('selectedGiftCardRecipient');
          setTimeout(() => setHighlightField(null), 2000);
        } else if (recipient.type === 'tiktok' && recipient.username) {
          setFormData(prev => ({
            ...prev,
            recipientType: 'tiktok',
            recipientUsername: recipient.username.replace(/^@/, '')
          }));
          setHighlightField('tiktok');
          toast.success(`Selected ${recipient.displayName || recipient.username} for gift card`);
          localStorage.removeItem('selectedGiftCardRecipient');
          setTimeout(() => setHighlightField(null), 2000);
        } else if (recipient.type === 'instagram' && recipient.username) {
          setFormData(prev => ({
            ...prev,
            recipientType: 'instagram',
            recipientUsername: recipient.username.replace(/^@/, '')
          }));
          setHighlightField('instagram');
          toast.success(`Selected ${recipient.displayName || recipient.username} for gift card`);
          localStorage.removeItem('selectedGiftCardRecipient');
          setTimeout(() => setHighlightField(null), 2000);
        } else if (recipient.type === 'address' && recipient.address) {
          setFormData(prev => ({
            ...prev,
            recipientType: 'address',
            recipientAddress: recipient.address
          }));
          toast.success(`Selected ${recipient.displayName || recipient.address.slice(0, 6) + '...' + recipient.address.slice(-4)} for gift card`);
          localStorage.removeItem('selectedGiftCardRecipient');
        }
      } catch (error) {
        console.error('Error parsing selected recipient:', error);
        localStorage.removeItem('selectedGiftCardRecipient');
      }
    }
  }, []);

  const updateFormData = (field: keyof GiftCardData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    setIsSocialsOpen(formData.recipientType !== 'address');
  }, [formData.recipientType]);

  const handleCreateCard = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    // Validate based on recipient type
    if (formData.recipientType === 'address') {
      if (!formData.recipientAddress || !formData.recipientAddress.startsWith('0x')) {
        setError('Please enter a valid recipient address');
        return;
      }
    } else if (formData.recipientType === 'twitter') {
      if (!formData.recipientUsername || formData.recipientUsername.trim() === '') {
        setError('Please enter a Twitter username');
        return;
      }
    } else if (formData.recipientType === 'twitch') {
      if (!formData.recipientUsername || formData.recipientUsername.trim() === '') {
        setError('Please enter a Twitch username');
        return;
      }
    } else if (formData.recipientType === 'telegram') {
      if (!formData.recipientUsername || formData.recipientUsername.trim() === '') {
        setError('Please enter a Telegram username');
        return;
      }
    } else if (formData.recipientType === 'tiktok') {
      if (!formData.recipientUsername || formData.recipientUsername.trim() === '') {
        setError('Please enter a TikTok username');
        return;
      }
    } else if (formData.recipientType === 'instagram') {
      if (!formData.recipientUsername || formData.recipientUsername.trim() === '') {
        setError('Please enter an Instagram username');
        return;
      }
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Step 1: Generate image
      setStep('generating');
      toast.info('Generating gift card image...');
      
      const imageBlob = await imageGenerator.generateGiftCardImage({
        amount: formData.amount,
        currency: formData.currency,
        message: formData.message,
        design: formData.design,
        customImage: formData.customImage || undefined
      });

      // Step 2: Upload to Pinata
      setStep('uploading');
      toast.info('Uploading to IPFS...');
      
      const metadataUri = await pinataService.createGiftCardNFT(
        formData.amount,
        formData.currency,
        formData.message,
        formData.design,
        imageBlob
      );

      // Step 3: Initialize web3 service
      // Try to use wagmi walletClient first, fallback to creating one manually
      let clientToUse = walletClient;
      if (!clientToUse) {
        console.log('wagmi walletClient not available, creating manual client...');
        clientToUse = createWalletClient({
          chain: arcTestnet,
          transport: custom(window.ethereum)
        });
      }

      await web3Service.initialize(clientToUse, address);

      // Step 4: Create gift card on blockchain
      setStep('creating');
      toast.info('Creating gift card on blockchain...');
      
      let result;
      
      // Use different methods based on recipient type
      if (formData.recipientType === 'twitter') {
        // Normalize username for consistency (createCardForTwitter also normalizes)
        const normalizedUsername = formData.recipientUsername.toLowerCase().replace(/^@/, '').trim();
        console.log('[CreateGiftCard] Creating Twitter card:', {
          original: formData.recipientUsername,
          normalized: normalizedUsername
        });
        
        // Use new Vault flow for Twitter cards
        result = await web3Service.createCardForTwitter(
          normalizedUsername, // Using normalized username
          formData.amount,
          formData.currency,
          metadataUri,
          formData.message
        );
        
        // Still save metadata to KV for additional info (using normalized username)
        try {
          await createTwitterCardMapping({
            tokenId: result.tokenId,
            username: normalizedUsername, // Saving normalized username
            temporaryOwner: '', // No longer needed with Vault
            senderAddress: address,
            amount: formData.amount,
            currency: formData.currency,
            message: formData.message,
            metadataUri: metadataUri
          });
        } catch (error) {
          console.error('Error saving Twitter card metadata:', error);
          // Non-critical error, card is already created on blockchain
        }
      } else if (formData.recipientType === 'twitch') {
        const normalizedUsername = formData.recipientUsername.toLowerCase().trim();
        console.log('[CreateGiftCard] Creating Twitch card:', {
          original: formData.recipientUsername,
          normalized: normalizedUsername
        });
        
        result = await web3Service.createCardForTwitch(
          normalizedUsername,
          formData.amount,
          formData.currency,
          metadataUri,
          formData.message
        );
        
        try {
          await createTwitchCardMapping({
            tokenId: result.tokenId,
            username: normalizedUsername,
            temporaryOwner: '',
            senderAddress: address,
            amount: formData.amount,
            currency: formData.currency,
            message: formData.message,
            metadataUri: metadataUri
          });
        } catch (error) {
          console.error('Error saving Twitch card metadata:', error);
        }
      } else if (formData.recipientType === 'telegram') {
        const normalizedUsername = formData.recipientUsername.toLowerCase().replace(/^@/, '').trim();
        console.log('[CreateGiftCard] Creating Telegram card:', {
          original: formData.recipientUsername,
          normalized: normalizedUsername
        });

        result = await web3Service.createCardForTelegram(
          normalizedUsername,
          formData.amount,
          formData.currency,
          metadataUri,
          formData.message
        );

        try {
          await createTelegramCardMapping({
            tokenId: result.tokenId,
            username: normalizedUsername,
            temporaryOwner: '',
            senderAddress: address,
            amount: formData.amount,
            currency: formData.currency,
            message: formData.message,
            metadataUri: metadataUri
          });
        } catch (error) {
          console.error('Error saving Telegram card metadata:', error);
        }
      } else if (formData.recipientType === 'tiktok') {
        const normalizedUsername = formData.recipientUsername.toLowerCase().replace(/^@/, '').trim();
        console.log('[CreateGiftCard] Creating TikTok card:', {
          original: formData.recipientUsername,
          normalized: normalizedUsername
        });

        result = await web3Service.createCardForTikTok(
          normalizedUsername,
          formData.amount,
          formData.currency,
          metadataUri,
          formData.message
        );

        try {
          await createTikTokCardMapping({
            tokenId: result.tokenId,
            username: normalizedUsername,
            temporaryOwner: '',
            senderAddress: address,
            amount: formData.amount,
            currency: formData.currency,
            message: formData.message,
            metadataUri: metadataUri
          });
        } catch (error) {
          console.error('Error saving TikTok card metadata:', error);
        }
      } else if (formData.recipientType === 'instagram') {
        const normalizedUsername = formData.recipientUsername.toLowerCase().replace(/^@/, '').trim();
        console.log('[CreateGiftCard] Creating Instagram card:', {
          original: formData.recipientUsername,
          normalized: normalizedUsername
        });

        result = await web3Service.createCardForInstagram(
          normalizedUsername,
          formData.amount,
          formData.currency,
          metadataUri,
          formData.message
        );

        try {
          await createInstagramCardMapping({
            tokenId: result.tokenId,
            username: normalizedUsername,
            temporaryOwner: '',
            senderAddress: address,
            amount: formData.amount,
            currency: formData.currency,
            message: formData.message,
            metadataUri: metadataUri
          });
        } catch (error) {
          console.error('Error saving Instagram card metadata:', error);
        }
      } else {
        // Standard flow for address recipients
        result = await web3Service.createGiftCard(
          formData.recipientAddress,
          formData.amount,
          formData.currency,
          metadataUri,
          formData.message
        );
      }

      setStep('success');
      
      const createdCardData = {
        id: result.tokenId,
        recipientAddress: formData.recipientAddress,
        amount: formData.amount,
        currency: formData.currency,
        design: formData.design,
        message: formData.message,
        secretMessage: formData.secretMessage,
        hasTimer: formData.hasTimer,
        timerHours: formData.timerHours,
        hasPassword: formData.hasPassword,
        expiryDays: formData.expiryDays,
        customImage: formData.customImage,
        nftCover: formData.nftCover,
        status: 'active',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + formData.expiryDays * 24 * 60 * 60 * 1000).toISOString(),
        qr_code: `sendly://redeem/${result.tokenId}`,
        tx_hash: result.txHash,
        metadata_uri: metadataUri
      };

      setCreatedCard(createdCardData);
      toast.success(`Gift card created successfully! Token ID: ${result.tokenId}`);
      toast.success(`Gift card created successfully! TX: ${result.txHash.slice(0, 10)}...${result.txHash.slice(-8)}`);
      
      // Save to Supabase for caching
      try {
        const recipientUsernameForStorage =
          formData.recipientType === 'address'
            ? null
            : formData.recipientUsername.replace(/^@/, '').trim();
        await GiftCardsService.upsertCard({
          token_id: result.tokenId,
          sender_address: address.toLowerCase(),
          recipient_address: formData.recipientType === 'address' ? formData.recipientAddress.toLowerCase() : null,
          recipient_username: recipientUsernameForStorage,
          recipient_type: formData.recipientType,
          amount: formData.amount,
          currency: formData.currency,
          message: formData.message,
          redeemed: false,
          tx_hash: result.txHash,
        });
        console.log('Card saved to Supabase cache');
      } catch (error) {
        console.error('Error saving card to Supabase:', error);
      }
      
      // Reset form
      setFormData({
        recipientType: 'address',
        recipientAddress: '',
        recipientUsername: '',
        amount: '1',
        currency: 'USDC',
        design: 'pink',
        message: '',
        secretMessage: '',
        hasTimer: false,
        timerHours: 24,
        hasPassword: false,
        password: '',
        expiryDays: 7,
        customImage: '',
        nftCover: ''
      });
    } catch (error) {
      console.error('Error creating gift card:', error);
      
      // Check if it's a chain ID error with Coinbase Wallet
      const errorMessage = error instanceof Error ? error.message : 'Failed to create gift card';
      if (errorMessage.includes('invalid chain ID') && typeof window !== 'undefined' && (window as any).ethereum?.isCoinbaseWallet) {
        setError('Coinbase Wallet has issues with Arc Testnet. Please use MetaMask or Rainbow Wallet to work with Arc Testnet.');
        toast.error('Error: use MetaMask or Rainbow Wallet', {
          description: 'Coinbase Wallet is not supported for Arc Testnet'
        });
      } else {
        setError(errorMessage);
        toast.error('Failed to create gift card');
      }
    } finally {
      setIsCreating(false);
      setStep('form');
    }
  };

  const handleShare = (method?: 'email' | 'x' | 'tiktok' | 'copy') => {
    if (!createdCard) return;
    
    const shareUrl = `${window.location.origin}/redeem/${createdCard.id}`;
    const shareText = `🎁 Receive a Sendly gift card for $${createdCard.amount} ${createdCard.currency}! ${shareUrl}`;
    
    if (method === 'email') {
      const mailtoLink = `mailto:?subject=🎁 Sendly Gift Card&body=${encodeURIComponent(shareText)}`;
      window.location.href = mailtoLink;
      toast.success('Email app opened');
    } else if (method === 'x') {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      window.open(twitterUrl, '_blank');
      toast.success('Twitter opened for posting');
    } else if (method === 'tiktok') {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied! Paste it in TikTok');
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  const getCardColor = () => {
    switch (formData.design) {
      case 'pink': return 'from-pink-400 to-purple-500';
      case 'blue': return 'from-blue-400 to-cyan-500';
      case 'green': return 'from-green-400 to-emerald-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getStepText = () => {
    switch (step) {
      case 'generating': return 'Generating image...';
      case 'uploading': return 'Uploading to IPFS...';
      case 'creating': return 'Creating on blockchain...';
      case 'success': return 'Success!';
      default: return 'Create a card';
    }
  };

  const openCircleBridge = () => {
    const baseUrl = import.meta.env.VITE_CIRCLE_BRIDGE_URL || 'https://faucet.circle.com/';
    const url = baseUrl;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isConnected) {
    return (
      <div className="p-6 text-center">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to create gift cards
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Create a gift card</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="space-y-4">
          <div>
            <Label>Recipient type</Label>
            <RadioGroup
              value={formData.recipientType}
              onValueChange={(value: 'address' | 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram') => updateFormData('recipientType', value)}
              className="mt-2 space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="address" id="address" />
                <Label htmlFor="address" className="cursor-pointer font-normal">
                  Wallet address
                </Label>
              </div>
              <Collapsible open={isSocialsOpen} onOpenChange={setIsSocialsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex w-full items-center justify-between bg-muted/20"
                  >
                    <span>Socials</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isSocialsOpen ? 'rotate-180' : ''}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-2 rounded-lg border border-dashed border-gray-200 p-3">
                  {SOCIAL_RECIPIENT_OPTIONS.map((option) => (
                    <div className="flex items-center space-x-2" key={option.value}>
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="cursor-pointer font-normal">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </RadioGroup>
          </div>

          {formData.recipientType === 'address' ? (
            <div>
              <Label htmlFor="recipient">Recipient address (0x)</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={formData.recipientAddress}
                onChange={(e) => updateFormData('recipientAddress', e.target.value)}
                className="mt-2"
              />
            </div>
          ) : formData.recipientType === 'twitter' ? (
            <div>
              <Label htmlFor="username">Twitter username</Label>
              <Input
                id="username"
                placeholder="username"
                value={formData.recipientUsername}
                onChange={(e) => {
                  let username = e.target.value;
                  if (username.startsWith('@')) {
                    username = username.slice(1);
                  }
                  updateFormData('recipientUsername', username);
                }}
                className={`mt-2 transition-all duration-500 ${
                  highlightField === 'twitter' 
                    ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300 shadow-md' 
                    : ''
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                The recipient will need to login via Privy with Twitter to claim the card.
              </p>
            </div>
          ) : formData.recipientType === 'twitch' ? (
            <div>
              <Label htmlFor="username">Twitch username</Label>
              <Input
                id="username"
                placeholder="username"
                value={formData.recipientUsername}
                onChange={(e) => {
                  const username = e.target.value.trim();
                  updateFormData('recipientUsername', username);
                }}
                className={`mt-2 transition-all duration-500 ${
                  highlightField === 'twitch' 
                    ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-300 shadow-md' 
                    : ''
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                The recipient will need to login via Privy with Twitch to claim the card.
              </p>
            </div>
          ) : formData.recipientType === 'telegram' ? (
            <div>
              <Label htmlFor="username">Telegram username</Label>
              <Input
                id="username"
                placeholder="nickname"
                value={formData.recipientUsername}
                onChange={(e) => {
                  let username = e.target.value.trim();
                  if (username.startsWith('@')) {
                    username = username.slice(1);
                  }
                  updateFormData('recipientUsername', username);
                }}
                className={`mt-2 transition-all duration-500 ${
                  highlightField === 'telegram'
                    ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-300 shadow-md'
                    : ''
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                The recipient will need to login via Privy with Telegram to claim the card.
              </p>
            </div>
          ) : formData.recipientType === 'tiktok' ? (
            <div>
              <Label htmlFor="username">TikTok username</Label>
              <Input
                id="username"
                placeholder="nickname"
                value={formData.recipientUsername}
                onChange={(e) => {
                  let username = e.target.value.trim();
                  if (username.startsWith('@')) {
                    username = username.slice(1);
                  }
                  updateFormData('recipientUsername', username);
                }}
                className={`mt-2 transition-all duration-500 ${
                  highlightField === 'tiktok'
                    ? 'bg-neutral-900/10 border-black ring-2 ring-neutral-400 shadow-md'
                    : ''
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                The recipient will need to login via Privy with TikTok to claim the card.
              </p>
            </div>
          ) : (
            <div>
              <Label htmlFor="username">Instagram username</Label>
              <Input
                id="username"
                placeholder="nickname"
                value={formData.recipientUsername}
                onChange={(e) => {
                  let username = e.target.value.trim();
                  if (username.startsWith('@')) {
                    username = username.slice(1);
                  }
                  updateFormData('recipientUsername', username);
                }}
                className={`mt-2 transition-all duration-500 ${
                  highlightField === 'instagram'
                    ? 'bg-pink-50 border-pink-400 ring-2 ring-pink-300 shadow-md'
                    : ''
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                The recipient will need to login via Privy with Instagram to claim the card.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="amount">Amount (in $)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="10"
              value={formData.amount}
              onChange={(e) => updateFormData('amount', e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Card design</Label>
            <div className="flex gap-2 mt-2">
              {[
                { value: 'pink', label: 'Pink', color: 'bg-pink-400' },
                { value: 'blue', label: 'Blue', color: 'bg-blue-400' },
                { value: 'green', label: 'Green', color: 'bg-green-400' },
              ].map((design) => (
                <Button
                  key={design.value}
                  variant={formData.design === design.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFormData('design', design.value)}
                  className="flex items-center gap-2"
                >
                  <div className={`w-3 h-3 rounded-full ${design.color}`}></div>
                  {design.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Currency</Label>
              <Select value={formData.currency} onValueChange={(value: 'USDC' | 'EURC') => updateFormData('currency', value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="EURC">EURC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="space-y-4">
          <Label>Preview of gift card</Label>
          
          <Card className={`bg-gradient-to-br ${getCardColor()} text-white border-0 shadow-lg`}>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <Gift className="w-6 h-6" />
                  <span className="text-lg font-medium">Gift Card</span>
                </div>
                
                <div className="text-4xl font-bold">
                  ${formData.amount || '0'}
                </div>
                
                <div className="text-sm opacity-90">
                  {formData.currency}
                </div>
                
                {formData.message && (
                  <div className="text-sm bg-white/20 rounded-lg p-3 mt-4">
                    "{formData.message}"
                  </div>
                )}

                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {formData.hasTimer && (
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      <Clock className="w-3 h-3 mr-1" />
                      {formData.timerHours}h delay
                    </Badge>
                  )}
                  {formData.hasPassword && (
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      <Lock className="w-3 h-3 mr-1" />
                      Protected
                    </Badge>
                  )}
                  {formData.expiryDays < 365 && (
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {formData.expiryDays}d expiry
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button 
              variant="outline"
              className="w-full"
              size="sm"
              onClick={openCircleBridge}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Top up {formData.currency} on Arc (Circle Bridge)
            </Button>
                         <Button 
               variant="outline"
               className="w-full"
               size="sm"
               onClick={() => {
                 const bridgeUrl = generateBridgeUrlFromArc('base-sepolia', formData.currency);
                 navigate(bridgeUrl);
               }}
             >
               <ExternalLink className="w-4 h-4 mr-2" />
               Bridge {formData.currency} to Base Sepolia
             </Button>
            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleCreateCard}
              disabled={isCreating}
            >
              {isCreating ? getStepText() : 'Create a card'}
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                disabled={!createdCard}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Generate QR
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    disabled={!createdCard}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleShare('email')}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send via Email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('x')}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Share on X (Twitter)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('tiktok')}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share on TikTok
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('copy')}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* <div className="flex flex-col items-start space-y-1"> 
             {/* <div className="flex items-center space-x-2 text-sm text-gray-600">
                <input type="checkbox" id="paymaster" disabled className="opacity-50 cursor-not-allowed" />
                <Label htmlFor="paymaster" className="opacity-50 cursor-not-allowed">Use paymaster</Label>
              </div>
              <span className="text-gray-500 text-xs ml-5">Coming soon</span>
            </div> */}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {createdCard && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <div>Gift card created successfully! Token ID: {createdCard.id}</div>
                <div className="text-sm">
                  TX: 
                  <button
                    onClick={() => {
                      const explorer = import.meta.env.VITE_ARC_BLOCK_EXPLORER_URL || 'https://testnet.arcscan.app';
                      window.open(`${explorer}/tx/${createdCard.tx_hash}`, '_blank');
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors ml-1"
                    title={`View on Arc Explorer: ${createdCard.tx_hash}`}
                  >
                    {createdCard.tx_hash.slice(0, 10)}...{createdCard.tx_hash.slice(-8)}
                  </button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Message field - spans both columns */}
        <div className="lg:col-span-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Your message here..."
            value={formData.message}
            onChange={(e) => updateFormData('message', e.target.value)}
            className="mt-2 w-full"
          />
        </div>

        {/* Advanced Features Toggle */}
        <div className="lg:col-span-2 flex items-center space-x-2 -mt-4">
          <Checkbox
            id="advanced"
            checked={showAdvanced}
            onCheckedChange={(checked) => {
              if (typeof checked === 'boolean') {
                setShowAdvanced(checked);
              }
            }}
          />
          <Label htmlFor="advanced" className="cursor-pointer">Advanced features</Label>
        </div>
      </div>

      {/* Advanced Features - Full width, below grid */}
      {showAdvanced && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {/* Secret Message */}
          <div>
            <Label htmlFor="secret" className="text-base font-medium">Secret message (revealed after activation)</Label>
            <Textarea
              id="secret"
              placeholder="A special message or promo code..."
              value={formData.secretMessage}
              onChange={(e) => updateFormData('secretMessage', e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>

          {/* Timer Feature */}
          <div className="flex items-center space-x-2">
            <Switch
              id="timer"
              checked={formData.hasTimer}
              onCheckedChange={(checked) => updateFormData('hasTimer', checked)}
            />
            <Label htmlFor="timer" className="text-base font-medium cursor-pointer">Open later (timer)</Label>
          </div>

          {formData.hasTimer && (
            <div className="pl-6 space-y-1">
              <Label className="text-base">Hours until card can be opened: {formData.timerHours}h</Label>
              <Slider
                value={[formData.timerHours]}
                onValueChange={(value) => updateFormData('timerHours', value[0])}
                max={168}
                min={1}
                step={1}
                className="mt-2 w-full"
              />
            </div>
          )}

          {/* Password Protection */}
          <div className="flex items-center space-x-2">
            <Switch
              id="password"
              checked={formData.hasPassword}
              onCheckedChange={(checked) => updateFormData('hasPassword', checked)}
            />
            <Label htmlFor="password" className="text-base font-medium cursor-pointer">Password protection</Label>
          </div>

          {formData.hasPassword && (
            <div className="pl-6">
              <Input
                placeholder="Enter password"
                type="password"
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                className="mt-2 w-full"
              />
            </div>
          )}

          {/* Expiry */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Card expires in: {formData.expiryDays} days</Label>
            <Slider
              value={[formData.expiryDays]}
              onValueChange={(value) => updateFormData('expiryDays', value[0])}
              max={365}
              min={1}
              step={1}
              className="mt-2 w-full"
            />
          </div>

          {/* Custom Design Upload */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Custom design</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="default" className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
              <Button variant="outline" size="default" className="flex-1">
                <Palette className="w-4 h-4 mr-2" />
                AI Generate
              </Button>
            </div>
          </div>

          {/* NFT Cover */}
          <div className="space-y-1">
            <Label htmlFor="nft" className="text-base font-medium">NFT Cover (optional)</Label>
            <Input
              id="nft"
              placeholder="NFT contract address or OpenSea URL"
              value={formData.nftCover}
              onChange={(e) => updateFormData('nftCover', e.target.value)}
              className="mt-2 w-full"
            />
          </div>
        </div>
      )}

      <BridgeDialog 
        open={isBridgeDialogOpen} 
        onOpenChange={setIsBridgeDialogOpen} 
      />
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Plus, Trash2, UserPlus, RefreshCw, Twitch, Twitter, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Badge } from './ui/badge';
import { Spinner } from './ui/spinner';
import { toast } from 'sonner';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../utils/supabase/client';
import { getAllSocialContacts, getTwitchContacts, getTwitterContacts } from '../utils/supabase/contacts';
import type { TwitchContact } from '../utils/twitch/contactsAPI';
import type { TwitterContact } from '../utils/supabase/contacts';

export interface Contact {
  name: string;
  wallet?: string;
  source?: 'manual' | 'twitch' | 'twitter' | 'tiktok' | 'instagram';
  socialId?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

interface ContactsManagerProps {
  contacts: Contact[];
  onContactsChange: (contacts: Contact[]) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0]?.toUpperCase())
    .join('')
    .slice(0, 2);
}

function getSourceBadge(source: Contact['source']) {
  if (!source || source === 'manual') return null;
  
  const badges: Record<string, { label: string; icon?: typeof Twitch | typeof Twitter; className: string }> = {
    twitch: { label: 'Twitch', icon: Twitch, className: 'bg-purple-100 text-purple-800' },
    twitter: { label: 'Twitter', icon: Twitter, className: 'bg-blue-100 text-blue-800' },
    tiktok: { label: 'TikTok', className: 'bg-black text-white' },
    instagram: { label: 'Instagram', className: 'bg-pink-100 text-pink-800' },
  };
  
  const badge = badges[source];
  if (!badge) return null;
  
  const Icon = badge.icon;
  return (
    <Badge variant="outline" className={`${badge.className} text-xs`}>
      {Icon && <Icon className="w-3 h-3 mr-1" />}
      {badge.label}
    </Badge>
  );
}

export function ContactsManager({ contacts, onContactsChange }: ContactsManagerProps) {
  const { authenticated, user } = usePrivy();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState<Contact>({ name: '', wallet: '' });
  const [syncing, setSyncing] = useState(false);
  const [syncingTwitter, setSyncingTwitter] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [twitchContacts, setTwitchContacts] = useState<TwitchContact[]>([]);
  const [loadingTwitchContacts, setLoadingTwitchContacts] = useState(false);
  const [twitterContacts, setTwitterContacts] = useState<TwitterContact[]>([]);
  const [loadingTwitterContacts, setLoadingTwitterContacts] = useState(false);

  const twitchAccount = user?.twitch;
  const twitterAccount = user?.twitter;
  const hasTwitch = !!twitchAccount?.subject;
  const hasTwitter = !!twitterAccount?.subject;

  useEffect(() => {
    const saved = localStorage.getItem('sendly_contacts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Contact[];
        if (parsed.length > 0 && contacts.length === 0) {
          onContactsChange(parsed);
        }
      } catch (e) {
        console.error('Error loading contacts:', e);
      }
    }
  }, [onContactsChange, contacts.length]);

  useEffect(() => {
    if (authenticated) {
      loadSocialContacts();
      if (hasTwitch) {
        loadTwitchContacts();
      }
      if (hasTwitter) {
        loadTwitterContacts();
      }
    }
  }, [authenticated, hasTwitch, hasTwitter]);

  useEffect(() => {
    const manualContacts = contacts.filter(c => !c.source || c.source === 'manual');
    if (manualContacts.length > 0) {
      localStorage.setItem('sendly_contacts', JSON.stringify(manualContacts));
    }
  }, [contacts]);

  const loadSocialContacts = async () => {
    if (!authenticated || !user?.id) return;

    try {
      setLoadingContacts(true);
      const socialContacts = await getAllSocialContacts(user.id);
      
      const manualContacts = contacts.filter(c => !c.source || c.source === 'manual');
      const updatedContacts = [...manualContacts, ...socialContacts];
      
      onContactsChange(updatedContacts);
    } catch (error) {
      console.error('Error loading social contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const loadTwitterContacts = async () => {
    if (!authenticated || !user?.id) return;

    try {
      setLoadingTwitterContacts(true);
      
      const twitterUserId = twitterAccount?.subject;
      if (!twitterUserId) {
        console.log('No Twitter user ID found in account');
        setTwitterContacts([]);
        return;
      }

      console.log('Loading Twitter contacts for Twitter user ID:', twitterUserId);

      try {
        const response = await apiCall(`/contacts/twitter?userId=${encodeURIComponent(twitterUserId)}`, {
          method: 'GET',
        });

        console.log('Server response:', response);

        if (response.success && response.contacts) {
          console.log(`Loaded ${response.contacts.length} Twitter contacts from server`);
          setTwitterContacts(response.contacts);
        } else {
          console.warn('Server endpoint returned unsuccessful response:', response);
          setTwitterContacts([]);
        }
      } catch (serverError) {
        console.error('Server endpoint error:', serverError);
        try {
          const twitterData = await getTwitterContacts(twitterUserId);
          console.log(`Loaded ${twitterData.length} Twitter contacts from direct query`);
          setTwitterContacts(twitterData);
        } catch (fallbackError) {
          console.error('Direct query also failed (likely RLS issue):', fallbackError);
          setTwitterContacts([]);
        }
      }
    } catch (error) {
      console.error('Error loading Twitter contacts:', error);
      setTwitterContacts([]);
    } finally {
      setLoadingTwitterContacts(false);
    }
  };

  const loadTwitchContacts = async () => {
    if (!authenticated || !user?.id) return;

    try {
      setLoadingTwitchContacts(true);
      
      // Try to get Twitch user ID from the account
      // This is the ID that was used when saving contacts during sync
      const twitchUserId = twitchAccount?.subject;
      if (!twitchUserId) {
        console.log('No Twitch user ID found in account');
        setTwitchContacts([]);
        return;
      }

      console.log('Loading Twitch contacts for Twitch user ID:', twitchUserId);

      // Use server endpoint to get contacts (bypasses RLS issues)
      // The server uses service_role key and can read all data
      try {
        const response = await apiCall(`/contacts/twitch?userId=${encodeURIComponent(twitchUserId)}`, {
          method: 'GET',
        });

        console.log('Server response:', response);

        if (response.success && response.contacts) {
          console.log(`Loaded ${response.contacts.length} Twitch contacts from server`);
          setTwitchContacts(response.contacts);
        } else {
          console.warn('Server endpoint returned unsuccessful response:', response);
          setTwitchContacts([]);
        }
      } catch (serverError) {
        console.error('Server endpoint error:', serverError);
        // Fallback: try direct Supabase query with Twitch user ID
        console.log('Trying direct Supabase query with Twitch user ID:', twitchUserId);
        try {
          // Note: This might fail due to RLS, but worth trying
          const twitchData = await getTwitchContacts(twitchUserId);
          console.log(`Loaded ${twitchData.length} Twitch contacts from direct query`);
          setTwitchContacts(twitchData);
        } catch (fallbackError) {
          console.error('Direct query also failed (likely RLS issue):', fallbackError);
          setTwitchContacts([]);
        }
      }
    } catch (error) {
      console.error('Error loading Twitch contacts:', error);
      setTwitchContacts([]);
    } finally {
      setLoadingTwitchContacts(false);
    }
  };

  const handleSyncTwitch = async () => {
    if (!authenticated || !user || !twitchAccount) {
      toast.error('Twitch account not connected');
      return;
    }

    const twitchUserId = twitchAccount.subject;
    if (!twitchUserId) {
      toast.error('Twitch user ID not found');
      return;
    }

    setSyncing(true);
    try {
      const twitchClientId = import.meta.env.VITE_TWITCH_CLIENT_ID;
      if (!twitchClientId) {
        throw new Error('Twitch Client ID not configured');
      }

      // First, try to get token from server via Privy API (this works correctly)
      let accessToken: string | null = null;
      let effectiveTwitchUserId = twitchUserId;

      try {
        console.log('Requesting Twitch token from server via Privy API...');
        console.log('User ID:', user.id);
        
        const tokenResponse = await apiCall('/contacts/get-twitch-token', {
          method: 'POST',
          body: JSON.stringify({
            privyUserId: user.id,
          }),
        });

        console.log('Server response:', JSON.stringify(tokenResponse, null, 2));

        if (tokenResponse.success && tokenResponse.accessToken) {
          accessToken = tokenResponse.accessToken;
          effectiveTwitchUserId = tokenResponse.twitchUserId || twitchUserId;
          console.log('✅ Token received from server via Privy API');
          
          // Save token to localStorage for future use
          if (accessToken) {
            localStorage.setItem('twitch_oauth', accessToken);
            localStorage.setItem('twitch_oauth_token', accessToken);
            console.log('Token saved to localStorage');
          }
        } else {
          // Server didn't return token - Privy doesn't provide OAuth tokens via API
          console.log('Server response indicates no token available');
          console.log('Response details:', {
            success: tokenResponse.success,
            error: tokenResponse.error,
            message: tokenResponse.message,
            twitchUserId: tokenResponse.twitchUserId
          });
          
          // Show helpful message to user
          if (tokenResponse.error?.includes('not available')) {
            toast.error(
              'Twitch OAuth token not available through Privy API. ' +
              'Privy does not provide OAuth tokens for security reasons. ' +
              'Please use the Privy dashboard to configure Twitch OAuth scopes.',
              { duration: 6000 }
            );
          }
        }
      } catch (error) {
        console.error('Failed to get token from server:', error);
        toast.error('Failed to get Twitch token from server. Please try again later.');
      }

      // If server didn't return token, try localStorage as fallback
      if (!accessToken) {
        const possibleKeys = [
          'twitch_oauth_token',
          'twitch_oauth',
          'twitch_token',
          'twitch_access_token'
        ];
        
        for (const key of possibleKeys) {
          const token = localStorage.getItem(key);
          if (token && token.length > 10) {
            accessToken = token;
            console.log(`Using saved token from localStorage (key: ${key})`);
            break;
          }
        }
      }

      // If still no token, use Implicit Grant Flow (according to Twitch docs)
      // This is for client-side apps without a server
      if (!accessToken) {
        console.log('No token found, starting Twitch Implicit Grant Flow...');
        accessToken = await requestTwitchOAuthTokenImplicitFlow(twitchClientId);
        
        if (accessToken) {
          localStorage.setItem('twitch_oauth', accessToken);
          localStorage.setItem('twitch_oauth_token', accessToken);
          console.log('Token saved to localStorage after OAuth');
        }
      }

      if (!accessToken) {
        throw new Error('Failed to get Twitch access token. Please try again.');
      }

      try {
        const response = await apiCall('/contacts/sync', {
          method: 'POST',
          body: JSON.stringify({
            platform: 'twitch',
            userId: effectiveTwitchUserId,
            accessToken: accessToken,
            clientId: twitchClientId,
            privyUserId: user.id,
          }),
        });

        if (response.success) {
          toast.success(`Synced ${response.contactsCount || 0} Twitch contacts`);
          await loadSocialContacts();
          await loadTwitchContacts();
        } else {
          // If error suggests token is invalid, remove it
          if (response.error?.includes('401') || response.error?.includes('unauthorized') || response.error?.includes('invalid token')) {
            console.log('Token appears to be invalid, removing from localStorage');
            localStorage.removeItem('twitch_oauth_token');
            throw new Error('Token expired. Please sync again.');
          }
          throw new Error(response.error || 'Sync failed');
        }
      } catch (syncError: any) {
        // If sync fails with 401, token might be invalid
        if (syncError?.message?.includes('401') || syncError?.message?.includes('unauthorized')) {
          console.log('Sync failed with 401, token might be invalid. Removing from localStorage');
          localStorage.removeItem('twitch_oauth_token');
          throw new Error('Token expired. Please sync again.');
        }
        throw syncError;
      }
    } catch (error) {
      console.error('Error syncing Twitch contacts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync contacts';
      toast.error(errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  // Twitch Implicit Grant Flow (for client-side apps)
  // According to Twitch docs: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#implicit-grant-flow
  const requestTwitchOAuthTokenImplicitFlow = async (clientId: string): Promise<string | null> => {
    return new Promise((resolve) => {
      // IMPORTANT: redirect_uri must be registered in Twitch Developer Console
      // Go to https://dev.twitch.tv/console/apps and add this redirect URI to your app
      const redirectUri = `${window.location.origin}/auth/twitch/callback`;
      const scopes = 'user:read:follows';
      const state = Math.random().toString(36).substring(7);
      
      // Store state for validation
      sessionStorage.setItem('twitch_oauth_state', state);
      sessionStorage.setItem('twitch_oauth_redirect', window.location.href);

      // Implicit grant flow uses response_type=token
      const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}&state=${state}`;

      console.log('Opening Twitch OAuth (Implicit Grant Flow)...');
      console.log('Make sure redirect_uri is registered in Twitch Developer Console:', redirectUri);
      toast.info('Opening Twitch authorization...');
      
      // Open OAuth window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        authUrl,
        'Twitch OAuth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        toast.error('Popup blocked. Please allow popups for this site.');
        resolve(null);
        return;
      }

      // Listen for message from popup callback route
      const messageHandler = (event: MessageEvent) => {
        // Filter out MetaMask and other extension messages
        if (event.data?.target === 'metamask-inpage' || event.data?.name === 'metamask-provider') {
          return;
        }
        
        if (event.origin !== window.location.origin) {
          return;
        }
        
        if (event.data && typeof event.data === 'object' && event.data.type === 'twitch_oauth_token' && event.data.accessToken) {
          const token = event.data.accessToken;
          console.log('✅ Received token via postMessage:', token.substring(0, 20) + '...');
          
          localStorage.setItem('twitch_oauth', token);
          localStorage.setItem('twitch_oauth_token', token);
          
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(token);
        } else if (event.data && typeof event.data === 'object' && event.data.type === 'twitch_oauth_error') {
          console.error('OAuth error received:', event.data);
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(null);
        }
      };

      window.addEventListener('message', messageHandler);

      // Check localStorage periodically (callback route saves token there)
      const checkStorage = setInterval(() => {
        const token = localStorage.getItem('twitch_oauth_token') || localStorage.getItem('twitch_oauth');
        if (token && token.length > 10) {
          console.log('Token found in localStorage during polling');
          clearInterval(checkStorage);
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(token);
        }
      }, 500);

      // Check if popup was closed
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          clearInterval(checkStorage);
          window.removeEventListener('message', messageHandler);
          const token = localStorage.getItem('twitch_oauth_token') || localStorage.getItem('twitch_oauth');
          if (token && token.length > 10) {
            resolve(token);
          } else {
            console.log('Popup closed without token');
            resolve(null);
          }
        }
      }, 1000);
    });
  };

  const handleSyncTwitter = async () => {
    if (!authenticated || !user || !twitterAccount) {
      toast.error('Twitter account not connected');
      return;
    }

    const twitterUserId = twitterAccount.subject;
    if (!twitterUserId) {
      toast.error('Twitter user ID not found');
      return;
    }

    setSyncingTwitter(true);
    try {
      let accessToken: string | null = null;
      let effectiveTwitterUserId = twitterUserId;

      try {
        console.log('Requesting Twitter token from server via Privy API...');
        
        const tokenResponse = await apiCall('/contacts/get-twitter-token', {
          method: 'POST',
          body: JSON.stringify({
            privyUserId: user.id,
          }),
        });

        console.log('Server response:', JSON.stringify(tokenResponse, null, 2));

        if (tokenResponse.success && tokenResponse.accessToken) {
          accessToken = tokenResponse.accessToken;
          effectiveTwitterUserId = tokenResponse.twitterUserId || twitterUserId;
          console.log('✅ Token received from server via Privy API');
          
          if (accessToken) {
            localStorage.setItem('twitter_oauth', accessToken);
            localStorage.setItem('twitter_oauth_token', accessToken);
            console.log('Token saved to localStorage');
          }
        } else {
          console.log('Server response indicates no token available');
        }
      } catch (error) {
        console.error('Failed to get token from server:', error);
      }

      if (!accessToken) {
        const possibleKeys = [
          'twitter_oauth_token',
          'twitter_oauth',
          'twitter_token',
          'twitter_access_token'
        ];
        
        for (const key of possibleKeys) {
          const token = localStorage.getItem(key);
          if (token && token.length > 10) {
            accessToken = token;
            console.log(`Using saved token from localStorage (key: ${key})`);
            break;
          }
        }
      }

      if (!accessToken) {
        console.log('No token found, attempting to use Privy for Twitter authorization...');
        
        // Try to use Privy's linkTwitter method if available
        // This will use Privy's redirect URI which is already configured
        try {
          // Check if Privy SDK has linkTwitter method
          if (typeof window !== 'undefined' && (window as any).privy) {
            toast.info('Redirecting to Twitter authorization via Privy...');
            // Privy will handle the OAuth flow with their redirect URI
            // After authorization, the token should be available through Privy
            // Note: Privy doesn't expose tokens directly, so we'll need to fallback
            // to direct OAuth if this doesn't work
          }
        } catch (privyError) {
          console.log('Privy linkTwitter not available, using direct OAuth flow');
        }
        
        // Fallback to direct OAuth flow
        console.log('Starting direct Twitter OAuth flow...');
        accessToken = await requestTwitterOAuthTokenFlow();
        
        if (accessToken) {
          localStorage.setItem('twitter_oauth', accessToken);
          localStorage.setItem('twitter_oauth_token', accessToken);
          console.log('Token saved to localStorage after OAuth');
        }
      }

      if (!accessToken) {
        throw new Error('Failed to get Twitter access token. Please try again.');
      }

      try {
        const response = await apiCall('/contacts/sync', {
          method: 'POST',
          body: JSON.stringify({
            platform: 'twitter',
            userId: effectiveTwitterUserId,
            accessToken: accessToken,
            privyUserId: user.id,
          }),
        });

        if (response.success) {
          toast.success(`Synced ${response.contactsCount || 0} Twitter contacts`);
          await loadSocialContacts();
          await loadTwitterContacts();
                  } else {
            if (response.error?.includes('401') || response.error?.includes('403') || response.error?.includes('unauthorized') || response.error?.includes('Forbidden') || response.error?.includes('invalid token')) {
              console.log('Token appears to be invalid or missing required scopes, removing from localStorage');
              localStorage.removeItem('twitter_oauth_token');
              localStorage.removeItem('twitter_oauth');
              throw new Error('Token expired or missing required permissions. Please authorize Twitter again with required scopes (users.read, follows.read).');
            }
            throw new Error(response.error || 'Sync failed');
          }
        } catch (syncError: any) {
          if (syncError?.message?.includes('401') || syncError?.message?.includes('403') || syncError?.message?.includes('unauthorized') || syncError?.message?.includes('Forbidden')) {
            console.log('Sync failed with 401/403, token might be invalid or missing scopes. Removing from localStorage');
            localStorage.removeItem('twitter_oauth_token');
            localStorage.removeItem('twitter_oauth');
            throw new Error('Twitter token expired or missing required permissions (follows.read scope). Please click "Sync Twitter" again to re-authorize.');
          }
          throw syncError;
      }
    } catch (error) {
      console.error('Error syncing Twitter contacts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync contacts';
      toast.error(errorMessage);
    } finally {
      setSyncingTwitter(false);
    }
  };

  const requestTwitterOAuthTokenFlow = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const twitterClientId = import.meta.env.VITE_TWITTER_CLIENT_ID;
      if (!twitterClientId) {
        toast.error('Twitter Client ID not configured');
        resolve(null);
        return;
      }

      const redirectUri = `${window.location.origin}/auth/twitter/callback`;
      // Twitter requires scopes to be space-separated in the URL, not plus-separated
      // But we encode it, so it doesn't matter
      const scopes = 'users.read follows.read offline.access';
      const state = Math.random().toString(36).substring(7);
      
      // Generate code_verifier for PKCE (43-128 characters, URL-safe)
      const generateCodeVerifier = (): string => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      };

      // Generate code_challenge using S256 (SHA256)
      const generateCodeChallenge = async (verifier: string): Promise<string> => {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      };

      const codeVerifier = generateCodeVerifier();
      
      generateCodeChallenge(codeVerifier).then((codeChallenge) => {
        sessionStorage.setItem('twitter_oauth_state', state);
        sessionStorage.setItem('twitter_oauth_redirect', window.location.href);
        sessionStorage.setItem('twitter_code_verifier', codeVerifier);

        const authUrl = `https://x.com/i/oauth2/authorize?redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256&client_id=${encodeURIComponent(twitterClientId)}`;

        console.log('Opening Twitter OAuth...');
        console.log('Redirect URI:', redirectUri);
        console.log('Full auth URL:', authUrl);
        console.log('Client ID:', twitterClientId);
        console.log('Scopes:', scopes);
        console.log('State:', state);
        console.log('Code Challenge:', codeChallenge);
        console.log('⚠️ IMPORTANT: Make sure the following is configured in Twitter Developer Console:');
        console.log('  1. Redirect URI is registered:', redirectUri);
        console.log('  2. App type is set to "OAuth 2.0"');
        console.log('  3. Client ID matches:', twitterClientId);
        console.log('  4. App permissions include: users.read, follows.read');
        console.log('');
        console.log('💡 NOTE: If you want to avoid registering your own redirect URI,');
        console.log('   you can use Privy SDK to link Twitter account (but Privy doesn\'t expose tokens).');
        console.log('   You need to register this redirect URI for your Twitter app:', redirectUri);
        toast.info('Opening Twitter authorization...');
        
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          authUrl,
          'Twitter OAuth',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
        );

        if (!popup) {
          toast.error('Popup blocked. Please allow popups for this site.');
          resolve(null);
          return;
        }

        const messageHandler = (event: MessageEvent) => {
          if (event.data?.target === 'metamask-inpage' || event.data?.name === 'metamask-provider') {
            return;
          }
          
          if (event.origin !== window.location.origin) {
            return;
          }
          
          if (event.data && typeof event.data === 'object' && event.data.type === 'twitter_oauth_token' && event.data.accessToken) {
            const token = event.data.accessToken;
            console.log('✅ Received token via postMessage:', token.substring(0, 20) + '...');
            
            localStorage.setItem('twitter_oauth', token);
            localStorage.setItem('twitter_oauth_token', token);
            
            window.removeEventListener('message', messageHandler);
            if (popup) popup.close();
            resolve(token);
          } else if (event.data && typeof event.data === 'object' && event.data.type === 'twitter_oauth_error') {
            console.error('OAuth error received:', event.data);
            window.removeEventListener('message', messageHandler);
            if (popup) popup.close();
            resolve(null);
          }
        };

        window.addEventListener('message', messageHandler);

        const checkStorage = setInterval(() => {
          const token = localStorage.getItem('twitter_oauth_token') || localStorage.getItem('twitter_oauth');
          if (token && token.length > 10) {
            console.log('Token found in localStorage during polling');
            clearInterval(checkStorage);
            window.removeEventListener('message', messageHandler);
            if (popup) popup.close();
            resolve(token);
          }
        }, 500);

        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            clearInterval(checkStorage);
            window.removeEventListener('message', messageHandler);
            const token = localStorage.getItem('twitter_oauth_token') || localStorage.getItem('twitter_oauth');
            if (token && token.length > 10) {
              resolve(token);
            } else {
              console.log('Popup closed without token');
              resolve(null);
            }
          }
        }, 1000);
      }).catch((error) => {
        console.error('Error generating code challenge:', error);
        toast.error('Failed to initialize Twitter OAuth');
        resolve(null);
      });
    });
  };

  const handleAddContact = () => {
    if (!newContact.name.trim() || !newContact.wallet?.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!newContact.wallet?.startsWith('0x') || newContact.wallet.length !== 42) {
      toast.error('Invalid wallet address format (must start with 0x and be 42 characters)');
      return;
    }

    const contact: Contact = {
      ...newContact,
      source: 'manual',
    };

    const updated = [...contacts, contact];
    onContactsChange(updated);
    setNewContact({ name: '', wallet: '' });
    setIsDialogOpen(false);
    toast.success('Contact added');
  };

  const handleDeleteContact = (index: number) => {
    const contact = contacts[index];
    if (contact.source && contact.source !== 'manual') {
      toast.error('Social contacts cannot be deleted. Unfollow them on the platform.');
      return;
    }

    const updated = contacts.filter((_, i) => i !== index);
    onContactsChange(updated);
    toast.success('Contact deleted');
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Contacts</CardTitle>
          <div className="flex items-center gap-2">
            {hasTwitch && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncTwitch}
                disabled={syncing || !authenticated}
              >
                {syncing ? <Spinner className="w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sync Twitch
              </Button>
            )}
            {hasTwitter && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncTwitter}
                disabled={syncingTwitter || !authenticated}
              >
                {syncingTwitter ? <Spinner className="w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sync Twitter
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasTwitch && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Twitch className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-base">Twitch</CardTitle>
            </div>
            {loadingTwitchContacts ? (
              <Alert>
                <AlertDescription>Loading Twitch contacts...</AlertDescription>
              </Alert>
            ) : twitchContacts.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No contacts found. Click "Sync Twitch" to sync.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-4">
                  {twitchContacts.map((contact, index) => (
                    <div key={`twitch-${contact.broadcaster_name}-${index}`}>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-purple-500 text-white">
                              {getInitials(contact.broadcaster_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span 
                                className="font-medium cursor-pointer hover:text-purple-600 transition-colors"
                                onClick={() => {
                                  localStorage.setItem('selectedGiftCardRecipient', JSON.stringify({
                                    type: 'twitch',
                                    username: contact.broadcaster_login,
                                    displayName: contact.broadcaster_name
                                  }));
                                  navigate('/create');
                                  toast.success(`Selected ${contact.broadcaster_name} for gift card`);
                                }}
                              >
                                {contact.broadcaster_name}
                              </span>
                              <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs">
                                <Twitch className="w-3 h-3 mr-1" />
                                Twitch
                              </Badge>
                            </div>
                            <div 
                              className="text-sm text-gray-500 cursor-pointer hover:text-purple-600 transition-colors"
                              onClick={() => {
                                localStorage.setItem('selectedGiftCardRecipient', JSON.stringify({
                                  type: 'twitch',
                                  username: contact.broadcaster_login,
                                  displayName: contact.broadcaster_name
                                }));
                                navigate('/create');
                                toast.success(`Selected ${contact.broadcaster_login} for gift card`);
                              }}
                            >
                              {contact.broadcaster_login}
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < twitchContacts.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
        {hasTwitter && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Twitter className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">Twitter</CardTitle>
            </div>
            {loadingTwitterContacts ? (
              <Alert>
                <AlertDescription>Loading Twitter contacts...</AlertDescription>
              </Alert>
            ) : twitterContacts.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No contacts found. Click "Sync Twitter" to sync.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-4">
                  {twitterContacts.map((contact, index) => (
                    <div key={`twitter-${contact.username}-${index}`}>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-500 text-white">
                              {getInitials(contact.display_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span 
                                className="font-medium cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => {
                                  localStorage.setItem('selectedGiftCardRecipient', JSON.stringify({
                                    type: 'twitter',
                                    username: contact.username,
                                    displayName: contact.display_name
                                  }));
                                  navigate('/create');
                                  toast.success(`Selected ${contact.display_name} for gift card`);
                                }}
                              >
                                {contact.display_name}
                              </span>
                              <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs">
                                <Twitter className="w-3 h-3 mr-1" />
                                Twitter
                              </Badge>
                            </div>
                            <div 
                              className="text-sm text-gray-500 cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => {
                                localStorage.setItem('selectedGiftCardRecipient', JSON.stringify({
                                  type: 'twitter',
                                  username: contact.username,
                                  displayName: contact.display_name
                                }));
                                navigate('/create');
                                toast.success(`Selected @${contact.username} for gift card`);
                              }}
                            >
                              @{contact.username}
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < twitterContacts.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600" />
              <CardTitle className="text-base">Personal Contact</CardTitle>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="contact-name">Name</Label>
                    <Input
                      id="contact-name"
                      placeholder="Alice"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-wallet">Wallet Address</Label>
                    <Input
                      id="contact-wallet"
                      placeholder="0x..."
                      value={newContact.wallet || ''}
                      onChange={(e) => setNewContact({ ...newContact, wallet: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <Button onClick={handleAddContact} className="w-full">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {loadingContacts ? (
            <Alert>
              <AlertDescription>Loading contacts...</AlertDescription>
            </Alert>
          ) : contacts.length === 0 ? (
            <Alert>
              <AlertDescription>
                You don't have any Personal contacts yet. Add contacts manually or sync from social media.
              </AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {contacts.map((contact, index) => (
                  <div key={`${contact.source || 'manual'}-${contact.socialId || contact.name}-${index}`}>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-10 w-10">
                          {contact.avatarUrl ? (
                            <img src={contact.avatarUrl} alt={contact.name} />
                          ) : (
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(contact.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{contact.name}</span>
                            {getSourceBadge(contact.source)}
                          </div>
                          {contact.wallet ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-sm text-gray-500 font-mono cursor-help">
                                  {contact.wallet.slice(0, 6)}...{contact.wallet.slice(-4)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {contact.wallet}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className="text-sm text-gray-400 italic">Not linked</div>
                          )}
                        </div>
                      </div>
                      {contact.source === 'manual' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteContact(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {index < contacts.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

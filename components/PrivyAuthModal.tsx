import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, LogOut } from 'lucide-react';

interface PrivyAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivyAuthModal({ isOpen, onClose }: PrivyAuthModalProps) {
  const privy = usePrivy();
  const { login, linkTwitter, linkTwitch, user, authenticated, unlinkTwitter, unlinkTwitch, logout } = privy;
  const [loading, setLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasTwitter = user?.twitter;
  const hasTwitch = user?.twitch;
  const hasInstagram = (user as any)?.instagram || (user as any)?.facebook;
  const linkedAccountsCount = user?.linkedAccounts?.length || 0;
  const canUnlink = linkedAccountsCount > 1;

  const handleLogin = async (provider: 'twitter' | 'twitch') => {
    try {
      setLoading(provider);
      setErrorMessage(null);
      
      if (authenticated && user) {
        if (provider === 'twitter') {
          await linkTwitter();
          onClose();
        } else if (provider === 'twitch') {
          await linkTwitch();
          onClose();
        }
      } else {
        await login();
        onClose();
      }
    } catch (error: any) {
      console.error(`Failed to ${authenticated && user ? 'link' : 'login'} with ${provider}:`, error);
      
      const errorMessage = (error?.message || error?.toString() || '').toLowerCase();
      const errorCode = error?.code || '';
      
      const isAccountLinkedError = 
        errorMessage.includes('already been linked') || 
        errorMessage.includes('already linked') ||
        errorMessage.includes('authentication failed') ||
        errorMessage.includes('linked to another user') ||
        errorCode.includes('account_already_linked') ||
        errorCode.includes('user_exists');
      
      if (isAccountLinkedError) {
        const providerName = provider === 'twitter' ? 'Twitter' : provider === 'twitch' ? 'Twitch' : 'social';
        setErrorMessage(`This ${providerName} account is already linked to another Privy user. To use a different ${providerName} account, please log out of your current session first.`);
        toast.error(`This account is already linked to another user`, {
          description: 'Log out of your current session and log in again with the desired account',
          duration: 5000,
        });
      } else {
        toast.error(`Failed to ${authenticated && user ? 'link' : 'login'}`, {
          description: errorMessage || 'Please try again',
        });
      }
      setLoading(null);
    }
  };

  const handleUnlink = async (provider: 'twitter' | 'twitch') => {
    try {
      setLoading(`unlink-${provider}`);
      
      if (!user) {
        toast.error('User not found');
        setLoading(null);
        return;
      }

      const hasAccount = provider === 'twitter' ? hasTwitter : hasTwitch;
      if (!hasAccount) {
        toast.error('Account not connected');
        setLoading(null);
        return;
      }

      onClose();
      
      if (provider === 'twitter' && user.twitter?.subject) {
        await unlinkTwitter(user.twitter.subject);
        toast.success('Twitter account unlinked successfully');
      } else if (provider === 'twitch' && user.twitch?.subject) {
        await unlinkTwitch(user.twitch.subject);
        toast.success('Twitch account unlinked successfully');
      }
    } catch (error) {
      console.error(`Failed to unlink ${provider}:`, error);
      toast.error(`Failed to unlink ${provider === 'twitter' ? 'Twitter' : 'Twitch'} account`);
    } finally {
      setLoading(null);
    }
  };

  const handleInstagramLogin = async () => {
    try {
      setLoading('instagram');
      setErrorMessage(null);
      
      if (authenticated && user) {
        const privyAny = privy as any;
        if (privyAny.linkOAuth) {
          await privyAny.linkOAuth({ provider: 'instagram' });
          onClose();
        } else if (privyAny.link) {
          await privyAny.link({ provider: 'instagram' });
          onClose();
        } else {
          toast.error('Linking Instagram is not available');
          setLoading(null);
        }
      } else {
        await login();
        onClose();
      }
    } catch (error: any) {
      console.error(`Failed to ${authenticated && user ? 'link' : 'login'} with Instagram:`, error);
      
      const errorMessage = (error?.message || error?.toString() || '').toLowerCase();
      const errorCode = error?.code || '';
      
      const isAccountLinkedError = 
        errorMessage.includes('already been linked') || 
        errorMessage.includes('already linked') ||
        errorMessage.includes('authentication failed') ||
        errorMessage.includes('linked to another user') ||
        errorCode.includes('account_already_linked') ||
        errorCode.includes('user_exists');
      
      if (isAccountLinkedError) {
        setErrorMessage('This Instagram account is already linked to another Privy user. To use a different Instagram account, please log out of your current session first.');
        toast.error('This account is already linked to another user', {
          description: 'Log out of your current session and log in again with the desired account',
          duration: 5000,
        });
      } else {
        toast.error(`Failed to ${authenticated && user ? 'link' : 'login'}`, {
          description: errorMessage || 'Please try again',
        });
      }
      setLoading(null);
    }
  };

  const handleInstagramUnlink = async () => {
    try {
      setLoading('unlink-instagram');
      
      if (!user) {
        toast.error('User not found');
        setLoading(null);
        return;
      }

      if (!hasInstagram) {
        toast.error('Instagram account not connected');
        setLoading(null);
        return;
      }

      if (linkedAccountsCount <= 1) {
        toast.error('Cannot unlink the last account');
        setLoading(null);
        return;
      }

      onClose();
      toast.error('Instagram unlinking not yet implemented');
    } catch (error) {
      console.error('Failed to unlink Instagram:', error);
      toast.error('Failed to unlink Instagram account');
    } finally {
      setLoading(null);
    }
  };

  const getTwitterUsername = () => {
    return user?.twitter?.username || 'Twitter';
  };

  const getTwitchUsername = () => {
    if (!user?.twitch) return 'Twitch';
    return (user.twitch as any).username || (user.twitch as any).email || 'Twitch';
  };

  const getInstagramUsername = () => {
    if (!hasInstagram) return 'Instagram';
    return (user as any)?.instagram?.username || (user as any)?.instagram?.email || 'Instagram';
  };

  const handleLogout = async () => {
    try {
      setLoading('logout');
      await logout();
      toast.success('Successfully logged out');
      setErrorMessage(null);
      onClose();
    } catch (error) {
      console.error('Failed to logout:', error);
      toast.error('Failed to log out');
    } finally {
      setLoading(null);
    }
  };

  const handleClose = () => {
    setErrorMessage(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Social Accounts</DialogTitle>
          <DialogDescription className="text-center">
            Connect or disconnect social accounts for login
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p>{errorMessage}</p>
                {authenticated && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    disabled={loading !== null}
                    className="w-full mt-2"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {loading === 'logout' ? 'Logging out...' : 'Log out and log in again'}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center overflow-hidden">
                  <img 
                    src="https://cdn.brandfetch.io/x.com/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" 
                    alt="X logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-medium">Twitter / X</div>
                  {hasTwitter && (
                    <div className="text-sm text-muted-foreground">
                      @{getTwitterUsername()}
                    </div>
                  )}
                </div>
              </div>
              {hasTwitter ? (
                canUnlink ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnlink('twitter')}
                    disabled={loading !== null}
                  >
                    {loading === 'unlink-twitter' ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Last account</span>
                )
              ) : (
                <Button
                  onClick={() => handleLogin('twitter')}
                  disabled={loading !== null}
                  size="sm"
                >
                  {loading === 'twitter' ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-700 rounded-lg flex items-center justify-center overflow-hidden">
                  <img 
                    src="https://cdn.brandfetch.io/idIwZCwD2f/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" 
                    alt="Twitch logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-medium">Twitch</div>
                  {hasTwitch && (
                    <div className="text-sm text-muted-foreground">
                      {getTwitchUsername()}
                    </div>
                  )}
                </div>
              </div>
              {hasTwitch ? (
                canUnlink ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnlink('twitch')}
                    disabled={loading !== null}
                  >
                    {loading === 'unlink-twitch' ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Last account</span>
                )
              ) : (
                <Button
                  onClick={() => handleLogin('twitch')}
                  disabled={loading !== null}
                  size="sm"
                >
                  {loading === 'twitch' ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-lg flex items-center justify-center overflow-hidden">
                  <svg 
                    className="w-full h-full p-2"
                    viewBox="0 0 512 512"
                    fill="white"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M349.33 69.33a93.62 93.62 0 0193.34 93.34v186.66a93.62 93.62 0 01-93.34 93.34H162.67a93.62 93.62 0 01-93.34-93.34V162.67a93.62 93.62 0 0193.34-93.34h186.66m0-37.33H162.67C90.8 32 32 90.8 32 162.67v186.66C32 421.2 90.8 480 162.67 480h186.66C421.2 480 480 421.2 480 349.33V162.67C480 90.8 421.2 32 349.33 32z"/>
                    <path d="M377.33 162.67a28 28 0 1128-28 27.94 27.94 0 01-28 28zM256 181.33A74.67 74.67 0 11181.33 256 74.75 74.75 0 01256 181.33m0-37.33a112 112 0 10112 112 112 112 0 00-112-112z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Instagram / Threads</div>
                  {hasInstagram && (
                    <div className="text-sm text-muted-foreground">
                      @{getInstagramUsername()}
                    </div>
                  )}
                </div>
              </div>
              {hasInstagram ? (
                canUnlink ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInstagramUnlink}
                    disabled={loading !== null}
                  >
                    {loading === 'unlink-instagram' ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Last account</span>
                )
              ) : (
                <Button
                  onClick={handleInstagramLogin}
                  disabled={loading !== null}
                  size="sm"
                >
                  {loading === 'instagram' ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {authenticated && (
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={handleLogout}
                disabled={loading !== null}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {loading === 'logout' ? 'Logging out...' : 'Log out'}
              </Button>
            </div>
          )}

          <div className="text-sm text-muted-foreground text-center">
            Connect accounts to receive and create gift cards
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


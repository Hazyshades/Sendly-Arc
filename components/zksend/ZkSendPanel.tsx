import { useMemo, useState } from 'react';

import { PendingPayments } from './PendingPayments';
import { SendPaymentForm } from './SendPaymentForm';
import { IdentitySelector } from './IdentitySelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { normalizeSocialUsername } from '../../utils/reclaim/identity';

export type ZkSendPlatform = 'twitter' | 'twitch' | 'github' | 'instagram' | 'tiktok' | 'gmail' | 'linkedin';

export function ZkSendPanel() {
  const [activeTab, setActiveTab] = useState<'create' | 'connections'>('create');
  const [platform, setPlatform] = useState<ZkSendPlatform>('twitter');
  const [username, setUsername] = useState('');

  const normalizedUsername = useMemo(() => normalizeSocialUsername(username.replace(/^@/, '')), [username]);
  const isIdentityValid = !!normalizedUsername;

  return (
    <div className="space-y-6">
      <IdentitySelector
        platform={platform}
        onPlatformChange={setPlatform}
        username={username}
        onUsernameChange={setUsername}
        isConnected={false}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create payment</TabsTrigger>
          <TabsTrigger value="connections">Connections & pending</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-4 space-y-6">
          <SendPaymentForm
            platform={platform}
            username={username}
            isIdentityValid={isIdentityValid}
            onGoToPending={() => setActiveTab('connections')}
          />
        </TabsContent>

        <TabsContent value="connections" className="mt-4 space-y-6">
          <PendingPayments
            platform={platform}
            username={username}
            isActive={activeTab === 'connections'}
            isIdentityValid={isIdentityValid}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}


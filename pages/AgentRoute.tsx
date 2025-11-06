import { VoicePaymentAgent } from '../components/VoicePaymentAgent';
import { DeveloperWalletComponent } from '../components/DeveloperWallet';
import { Layout } from './Layout';

export function AgentRoute() {
  return (
    <Layout>
      <div className="p-6 space-y-6">
        <DeveloperWalletComponent blockchain="ARC-TESTNET" />
        <VoicePaymentAgent />
      </div>
    </Layout>
  );
}


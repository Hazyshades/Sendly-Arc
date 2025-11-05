import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { sdk } from '@farcaster/miniapp-sdk';
import { SplashScreen } from '../components/SplashScreen';
import { useState } from 'react';
import { AgentRoute } from '../pages/AgentRoute';
import { CreateRoute } from '../pages/CreateRoute';
import { MyRoute } from '../pages/MyRoute';
import { SpendRoute } from '../pages/SpendRoute';
import { HistoryRoute } from '../pages/HistoryRoute';
import { TermsRoute } from '../pages/TermsRoute';
import { PrivacyRoute } from '../pages/PrivacyRoute';
import { BridgeRoute } from '../pages/BridgeRoute';
import { TwitchCallbackRoute } from '../pages/TwitchCallbackRoute';
import { TwitterCallbackRoute } from '../pages/TwitterCallbackRoute';

function AppRouter() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeMiniApp = async () => {
      try {
        await sdk.actions.ready();
        console.log('Mini App SDK initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Mini App SDK:', error);
      } finally {
        setTimeout(() => {
          setIsLoading(false);
        }, 1500);
      }
    };

    initializeMiniApp();
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Routes>
      <Route path="/agent" element={<AgentRoute />} />
      <Route path="/create" element={<CreateRoute />} />
      <Route path="/my" element={<MyRoute />} />
      <Route path="/spend" element={<SpendRoute />} />
      <Route path="/history" element={<HistoryRoute />} />
      <Route path="/terms" element={<TermsRoute />} />
      <Route path="/privacy" element={<PrivacyRoute />} />
      <Route path="/bridge/:chainSlug" element={<BridgeRoute />} />
      <Route path="/auth/twitch/callback" element={<TwitchCallbackRoute />} />
      <Route path="/auth/twitter/callback" element={<TwitterCallbackRoute />} />
      <Route path="/" element={<Navigate to="/agent" replace />} />
    </Routes>
  );
}

export default AppRouter;


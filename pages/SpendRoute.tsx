import { SpendCard } from '../components/SpendCard';
import { Layout } from './Layout';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function SpendRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenId = searchParams.get('tokenId') || '';

  return (
    <Layout>
      <SpendCard selectedTokenId={tokenId} />
    </Layout>
  );
}


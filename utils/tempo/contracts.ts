import { getContract, type Address, type WalletClient } from 'viem';
import { tempoClient } from './client';
import { GiftCardABI } from '../web3/constants';

// Получение экземпляра контракта GiftCard
export function getGiftCardContract(address: Address, walletClient?: WalletClient) {
  return getContract({
    address,
    abi: GiftCardABI,
    client: walletClient ? { public: tempoClient, wallet: walletClient } : tempoClient,
  });
}

// Пример: Создание подарочной карты
export async function createGiftCard(
  contractAddress: Address,
  recipient: Address,
  amount: bigint,
  token: Address,
  metadataURI: string,
  message: string,
  walletClient: WalletClient
) {
  if (!walletClient.account) {
    throw new Error('Wallet client не имеет аккаунта');
  }

  const account = walletClient.account;

  // Создаем контракт GiftCard с walletClient для записи (гарантированно write-enabled)
  const contract = getContract({
    address: contractAddress,
    abi: GiftCardABI,
    client: { public: tempoClient, wallet: walletClient },
  });

  // Сначала нужно одобрить токен
  const tokenContract = getContract({
    address: token,
    abi: [
      {
        constant: false,
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        type: 'function',
      },
    ],
    client: { public: tempoClient, wallet: walletClient },
  });

  // Одобрение токена
  await tokenContract.write.approve([contractAddress, amount], { account });

  // Создание подарочной карты
  const hash = await contract.write.createGiftCard([
    recipient,
    amount,
    token,
    metadataURI,
    message,
  ], { account });

  return hash;
}

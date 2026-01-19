/**
 * ChainSelector - UI component for selecting a network (ARC / Tempo / Base)
 */

import { useChain } from '../utils/chain/chainContext';
import { SUPPORTED_CHAIN_CONFIGS } from '../utils/chain/chainConfig';
import { Check, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

export function ChainSelector() {
  const { selectedChainId, selectedChain, setSelectedChainId, switchWalletToSelectedChain, isSwitching } = useChain();

  const handleChainChange = async (chainId: number) => {
    setSelectedChainId(chainId);
    
    // Attempt to switch the wallet to the selected network
    if (chainId !== selectedChainId) {
      await switchWalletToSelectedChain();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isSwitching}
          className="group bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-900 hover:bg-white px-4 py-2 rounded-2xl transition-all duration-200 flex items-center gap-2 shadow-circle-card font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{selectedChain?.name || 'Select Network'}</span>
          <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-2xl border-gray-200 p-1">
        {SUPPORTED_CHAIN_CONFIGS.map((chain) => (
          <DropdownMenuItem
            key={chain.chainId}
            onSelect={() => handleChainChange(chain.chainId)}
            className={`flex items-center justify-between px-4 py-2.5 ${
              chain.chainId === selectedChainId ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-900'
            }`}
          >
            <span>{chain.name}</span>
            {chain.chainId === selectedChainId && <Check className="h-4 w-4 text-blue-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
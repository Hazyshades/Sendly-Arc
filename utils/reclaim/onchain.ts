import type { ReclaimOnchainProof, ReclaimProof } from './types';

function toUint32(n: string | number, field: string): number {
  const num = typeof n === 'string' ? Number(n) : n;
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`Invalid ${field}: ${String(n)}`);
  }
  // Solidity expects uint32; clamp-check in JS
  if (num > 0xffffffff) {
    throw new Error(`${field} overflows uint32: ${String(n)}`);
  }
  return Math.trunc(num);
}

/**
 * Converts proof from Reclaim JS SDK to struct `Reclaim.Proof` format,
 * which is expected by `contracts/ZkSend.sol` (on-chain verifier).
 */
export function toOnchainReclaimProof(proof: ReclaimProof): ReclaimOnchainProof {
  const claimData = proof?.claimData;
  if (!claimData) {
    throw new Error('Reclaim proof is missing claimData');
  }
  if (!Array.isArray(proof.signatures) || proof.signatures.length === 0) {
    throw new Error('Reclaim proof is missing signatures');
  }

  return {
    claimInfo: {
      provider: String(claimData.provider),
      parameters: String(claimData.parameters),
      context: String(claimData.context),
    },
    signedClaim: {
      claim: {
        identifier: String(claimData.identifier) as `0x${string}`,
        owner: String(claimData.owner) as `0x${string}`,
        timestampS: toUint32(claimData.timestampS, 'timestampS'),
        epoch: toUint32(claimData.epoch, 'epoch'),
      },
      signatures: proof.signatures.map((s) => String(s) as `0x${string}`),
    },
  };
}


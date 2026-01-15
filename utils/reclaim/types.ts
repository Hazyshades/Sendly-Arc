export type ReclaimProof = {
  identifier?: string;
  claimData?: {
    provider: string;
    parameters: string;
    owner: string;
    timestampS: string | number;
    context: string;
    identifier: string;
    epoch: string | number;
  };
  signatures?: string[];
  witnesses?: Array<{ id: string; url: string }>;
  taskId?: string | null;
  publicData?: string | null;
  // Some SDK/provider versions may use slightly different keys; keep index signature.
  [key: string]: any;
};

export type ReclaimOnchainProof = {
  claimInfo: {
    provider: string;
    parameters: string;
    context: string;
  };
  signedClaim: {
    claim: {
      identifier: `0x${string}`;
      owner: `0x${string}`;
      timestampS: number;
      epoch: number;
    };
    signatures: `0x${string}`[];
  };
};


import { keccak256, toUtf8Bytes } from 'ethers';

/**
 * Generate social identity hash
 * Format: keccak256("platform:username") in lowercase.
 */
export function generateSocialIdentityHash(platform: string, username: string): `0x${string}` {
  const identity = `${platform.toLowerCase()}:${username.toLowerCase()}`;
  return keccak256(toUtf8Bytes(identity)) as `0x${string}`;
}


import { FastifyInstance } from 'fastify';
import { Address } from '@ton/core';
import axios, { AxiosError } from 'axios';

/**
 * Verify NFT ownership for a player and sync DB if ownership changed.
 * Throws an Error("Player is no longer owned by this wallet") when the
 * NFT owner in chain doesn't match the provided currentWalletAddress.
 *
 * Uses app.prisma (FastifyInstance) for DB access.
 */
export async function verifyAndSyncPlayerOwnership(
  app: FastifyInstance,
  playerId: string,
  currentWalletAddress: string,
) {
  const player = await app.prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new Error('Player not found');

  // Skip if not an NFT player
  if (!player.isNft) return;

  if (!player.nftAddress) {
    // If NFT address is missing, clear ownership to be safe
    await app.prisma.player.update({
      where: { id: playerId },
      data: { ownerId: null, inLineup: false, squadPosition: null },
    });
    throw new Error('Player NFT metadata missing');
  }

  const apiUrl = `https://tonapi.io/v2/nfts/${encodeURIComponent(player.nftAddress)}`;

  let actualOwnerAddress: string | null = null;

  try {
    const resp = await axios.get(apiUrl, { timeout: 5000 });
    // Defensive checks in response shape
    if (resp?.data && resp.data.owner && typeof resp.data.owner.address === 'string') {
      actualOwnerAddress = resp.data.owner.address;
    } else {
      throw new Error('TonAPI returned unexpected response shape');
    }
  } catch (err: any) {
    if (err instanceof AxiosError) {
      // Network / HTTP error
      const status = err.response?.status;
      const body = err.response?.data ?? err.message;
      throw new Error(`Failed to fetch NFT ownership from TonAPI: ${status ?? 'network'} - ${String(body)}`);
    }
    // timeout or other
    throw new Error(`Failed to fetch NFT ownership from TonAPI: ${String(err?.message ?? err)}`);
  }

  if (!actualOwnerAddress) {
    // If we couldn't determine owner, fail safe and block action
    throw new Error('Unable to determine NFT owner');
  }

  // Compare TON addresses using @ton/core Address.parse().equals()
  try {
    const actual = Address.parse(actualOwnerAddress);
    const current = Address.parse(currentWalletAddress);

    if (!actual.equals(current)) {
      // NFT ownership changed on-chain — reset DB state
      await app.prisma.player.update({
        where: { id: playerId },
        data: {
          inLineup: false,
          squadPosition: null,
        },
      });

      // Block the operation where this check is used
      throw new Error('Player is no longer owned by this wallet');
    }
  } catch (err: any) {
    // If address parsing fails, surface clear error
    throw new Error(`Failed to compare TON addresses: ${String(err?.message ?? err)}`);
  }
}

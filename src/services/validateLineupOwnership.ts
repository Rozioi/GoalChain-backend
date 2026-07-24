import { FastifyInstance } from 'fastify';
import { verifyAndSyncPlayerOwnership } from './nftOwnershipService';

/**
 * Validate a list of playerIds (lineup) that they are still owned by userWalletAddress.
 * Uses verifyAndSyncPlayerOwnership to sync DB when ownership changed.
 * Returns array of invalid playerIds that are no longer owned by the user.
 */
export async function validateLineupOwnership(
  app: FastifyInstance,
  playerIds: string[],
  userWalletAddress: string,
) {
  const invalidPlayers: string[] = [];

  for (const playerId of playerIds) {
    try {
      await verifyAndSyncPlayerOwnership(app, playerId, userWalletAddress);
    } catch (err) {
      // Any error here means this player cannot be used by the current wallet
      invalidPlayers.push(playerId);
    }
  }

  return invalidPlayers;
}

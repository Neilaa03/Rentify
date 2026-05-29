import { releaseEscrowsDue } from './escrowService.js';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_DELAY_MS = 24 * 60 * 60 * 1000;

export const runEscrowAutoReleaseOnce = async () => {
  const delayMs = Number(process.env.ESCROW_AUTO_RELEASE_DELAY_MS || DEFAULT_DELAY_MS);
  const cutoffDate = new Date(Date.now() - delayMs);
  return releaseEscrowsDue({ cutoffDate });
};

export const startEscrowAutoReleaseScheduler = () => {
  if (String(process.env.ESCROW_AUTO_RELEASE_ENABLED || 'true').toLowerCase() === 'false') {
    return null;
  }

  const intervalMs = Number(process.env.ESCROW_AUTO_RELEASE_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  const timer = setInterval(() => {
    runEscrowAutoReleaseOnce().catch((error) => {
      console.error('Escrow auto-release job failed:', error);
    });
  }, intervalMs);

  timer.unref?.();
  return timer;
};

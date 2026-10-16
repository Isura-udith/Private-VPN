/**
 * Formats a byte quantity into a human-readable string (B, KB, MB, GB, TB).
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const normalizedIndex = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, normalizedIndex)).toFixed(1))} ${sizes[normalizedIndex]}`;
}

/**
 * Formats duration in seconds into a human-readable string (e.g. "1h 12m 30s" or "2m 5s").
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m 0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

/**
 * Formats transfer speed in bytes per second (e.g. "1.2 MB/s").
 */
export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

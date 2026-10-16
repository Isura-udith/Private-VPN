import { useMemo } from 'react';
import { formatBytes, formatDuration, formatSpeed } from '../utils/formatters';

/**
 * Hook providing memoized data and measurement formatters.
 */
export const useFormatters = () => {
  return useMemo(
    () => ({
      formatBytes,
      formatDuration,
      formatSpeed,
    }),
    []
  );
};

export default useFormatters;

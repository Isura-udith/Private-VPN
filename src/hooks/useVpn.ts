import { useVpnContext, VpnContextType } from '../context/VpnContext';

/**
 * Hook to access the VPN global state and action handlers.
 */
export const useVpn = (): VpnContextType => {
  return useVpnContext();
};

export default useVpn;

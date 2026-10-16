# Private VPN - Security Architecture & Privacy Policy

Private VPN is designed following the principle of least privilege, zero telemetry, and robust defense-in-depth on Windows.

---

## 1. Key Storage & Windows DPAPI

- **No Plaintext Secrets**: WireGuard client private keys (`PrivateKey`) and preshared keys (`PresharedKey`) are never written to disk in plain text.
- **Hardware & User Session Binding**: Secrets are encrypted using `CryptProtectData` (Windows Data Protection API). The ciphertext can only be decrypted by the logged-in Windows user account on the same machine.
- **Frontend Isolation**: Private keys are never passed to the React frontend or developer console. Only the server identifier, name, endpoint, and public key are exposed to the UI.

---

## 2. Windows Firewall Kill Switch Enforcement

The Kill Switch in Private VPN is an actual Windows Firewall enforcement mechanism, not a superficial UI switch:

1. **Rule Structure**:
   - `PrivateVPN-KillSwitch-AllowLocal`: Allows internal subnet traffic (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) to maintain printer, local network, and router access.
   - `PrivateVPN-KillSwitch-AllowEndpoint`: Allows outbound UDP traffic specifically targeted at the remote VPN server IP and WireGuard port.
   - `PrivateVPN-KillSwitch-BlockAll`: Enforces an outbound block on all general network interfaces.
2. **Fail-Safe Cleanup**:
   - When disconnecting gracefully or when resetting, `emergency_reset_firewall()` flushes all `PrivateVPN-KillSwitch` rules to guarantee the user is never left without internet access.

---

## 3. DNS Leak Protection

- **Split DNS Prevention**: When connected, WireGuard configures the assigned VPN DNS resolver directly on the tunnel interface.
- **Diagnostics**: The Diagnostics screen inspects Windows network interfaces via `netsh interface ip show dns` and confirms active DNS servers.

---

## 4. IPv6 Leak Prevention

- If your ISP provides dual-stack IPv6 and your WireGuard server only routes IPv4, unencrypted IPv6 packets can bypass the tunnel.
- Private VPN provides an explicit IPv6 leak mitigation policy via Windows Firewall:
  ```powershell
  netsh advfirewall firewall add rule name="PrivateVPN-KillSwitch-BlockIPv6" dir=out action=block protocol=IPv6
  ```

---

## 5. Diagnostic Secret Sanitization

All diagnostic logging filters and redacts private keys and preshared keys using regular expression patterns (`redact_sensitive_text`):
- `PrivateKey = [REDACTED_PRIVATE_KEY]`
- `PresharedKey = [REDACTED_PRESHARED_KEY]`
Logs copied from the Diagnostics screen will never leak cryptographic material.

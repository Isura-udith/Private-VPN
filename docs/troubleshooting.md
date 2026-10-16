# Private VPN - Troubleshooting Guide

This guide addresses common issues, diagnostic steps, and recovery procedures.

---

## 1. "WireGuard software is not installed"

### Cause
Private VPN uses the official WireGuard for Windows engine (`wireguard.exe`) to manage native Wintun / WireGuardNT kernel adapters. If the executable is not found in `C:\Program Files\WireGuard\wireguard.exe` or `PATH`, this error appears.

### Solution
Install WireGuard using PowerShell or Command Prompt:
```powershell
winget install WireGuard.WireGuard
```
Or download the installer from [wireguard.com/install](https://www.wireguard.com/install/). Once installed, restart Private VPN.

---

## 2. "Administrator privileges are required"

### Cause
Windows requires elevated permissions to create network adapters, install Windows services, and modify firewall rules.

### Solution
Right-click on **Private VPN** or your terminal and select **Run as Administrator**.

---

## 3. Internet Blocked After Sudden Shutdown (Kill Switch Recovery)

### Cause
If the application crashes while the Kill Switch is active, the outbound block rule in Windows Firewall might remain in place.

### Solution
Private VPN includes an emergency recovery procedure. You can run this command in an Administrator PowerShell to instantly restore default connectivity:

```powershell
netsh advfirewall firewall delete rule name="PrivateVPN-KillSwitch-BlockAll"
netsh advfirewall firewall delete rule name="PrivateVPN-KillSwitch-AllowLocal"
netsh advfirewall firewall delete rule name="PrivateVPN-KillSwitch-AllowEndpoint"
netsh advfirewall firewall delete rule name="PrivateVPN-KillSwitch-BlockIPv6"
```

Alternatively, launch Private VPN, go to **Diagnostics**, and check that the firewall status is clear.

---

## 4. Public IP Address Unchanged After Connecting

### Cause
1. The remote WireGuard endpoint is not forwarding traffic or its NAT masquerading rule is missing on the server (`iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE`).
2. The `AllowedIPs` in the imported `.conf` is set to a restricted subnet (e.g. `10.0.0.0/24`) rather than full tunneling (`0.0.0.0/0, ::/0`).

### Solution
1. Ensure `AllowedIPs = 0.0.0.0/0, ::/0` in your WireGuard server configuration.
2. Verify with your server provider that IPv4 forwarding is enabled (`sysctl net.ipv4.ip_forward=1`).

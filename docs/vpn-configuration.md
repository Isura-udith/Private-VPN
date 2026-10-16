# Private VPN - VPN Configuration Guide

Private VPN is a free, open desktop client that connects to legitimate WireGuard VPN endpoints configured by you, your network administrator, or your VPN provider.

The application never bundles third-party stolen credentials or fake server lists. You have full ownership of your connection profiles.

---

## 1. WireGuard Configuration Format

To import a server, ensure your `.conf` file follows the official WireGuard format:

```ini
[Interface]
# 44-character base64 Client Private Key
PrivateKey = AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
# Local tunnel address (CIDR format)
Address = 10.14.0.2/32
# DNS resolver IP address
DNS = 1.1.1.1

[Peer]
# 44-character base64 Server Public Key
PublicKey = BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=
# Remote server address and UDP port
Endpoint = vpn.example.com:51820
# IP ranges routed through the tunnel (0.0.0.0/0, ::/0 routes all traffic)
AllowedIPs = 0.0.0.0/0, ::/0
# Optional pre-shared symmetric key
# PresharedKey = CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=
```

---

## 2. How to Import a Configuration

1. Launch **Private VPN**.
2. Navigate to **Locations** in the left sidebar.
3. Click the **Import WireGuard Config** button in the upper-right corner.
4. You can either:
   - Click **Upload File** and select your `.conf` file from disk.
   - Or paste the contents directly into the configuration text area.
5. Provide an optional friendly name (e.g., `Home Gateway`, `Company VPN`, `ProtonVPN Free Node`).
6. Click **Validate & Save**.

The application will:
- Check key lengths (must be 44-character base64).
- Validate endpoint host and port.
- Validate AllowedIPs CIDR formatting.
- Encrypt your client private key using Windows DPAPI.
- Save the configuration record to the local database.

---

## 3. Recommended Free WireGuard Sources

If you do not already have an authorized WireGuard endpoint, you can obtain one from:
1. **Self-Hosted VPS**:
   Deploy an open-source WireGuard server on Oracle Cloud Free Tier, DigitalOcean, or Linode using scripts like [angristan/wireguard-install](https://github.com/angristan/wireguard-install) or [wg-easy](https://github.com/wg-easy/wg-easy).
2. **Proton VPN Free Tier**:
   Proton VPN provides free WireGuard configuration exports on paid and promotional plans.
3. **Tailscale / Cloudflare WARP**:
   Using tools like `warp-cli` or official WARP WireGuard export profiles.

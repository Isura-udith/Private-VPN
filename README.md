# Private VPN

[![Rust](https://img.shields.io/badge/Rust-1.99+-orange.svg)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Private VPN** is a modern, free-to-use desktop VPN client for Windows 10 and Windows 11. It connects to legitimate WireGuard VPN endpoints, establishes real encrypted tunnels using the WireGuardNT engine, protects against DNS and IPv6 leaks, and enforces an actual Windows Firewall Kill Switch.

---

## Features

- **Real WireGuard Tunneling**: Integrates directly with the official WireGuard for Windows engine (`wireguard.exe` / WireGuardNT service).
- **Public IP Verification**: Validates pre- and post-tunnel public IP changes in real time across multiple trusted HTTPS providers (ipwho.is, api64.ipify.org, icanhazip.com).
- **Windows Firewall Kill Switch**: Uses native `netsh advfirewall` rules to block non-tunnel outbound internet leaks if the connection drops.
- **Hardware-Backed Credential Security**: Encrypts client private keys using the **Windows Data Protection API (DPAPI)** (`CryptProtectData`), tied to the user's logon session. Zero secret exposure to the frontend.
- **IPv6 & DNS Leak Guard**: Explicit IPv6 blocking policy and DNS leak diagnostics.
- **Clean Cybersecurity Interface**: Custom dark navy and charcoal theme with subtle animations, Lucide icons, responsive layouts, and light mode option.
- **Diagnostics & Sanitized Logging**: Live system inspection (WireGuard executable path, Administrator privilege check, gateway route, active DNS) with automatic redaction of cryptographic keys.
- **Local SQLite Storage**: Saves preferences, favorite server nodes, and session duration history without tracking browsing habits.

---

## Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Desktop Framework** | [Tauri 2](https://tauri.app/) |
| **Application Core** | Rust 2024 edition |
| **Frontend UI** | React 19, TypeScript, Vite, Tailwind CSS 4 |
| **Iconography** | Lucide React |
| **VPN Engine** | WireGuard for Windows (WireGuardNT / Wintun) |
| **Secure Key Storage** | Windows DPAPI (`Crypt32.dll`) |
| **Firewall Enforcement**| Windows Advanced Firewall (`netsh advfirewall`) |
| **Local Database** | SQLite (via `rusqlite` bundled) |

See [docs/architecture.md](docs/architecture.md) for full architectural diagrams and data flow.

---

## Prerequisites

1. **Operating System**: Windows 10 or Windows 11 (64-bit).
2. **WireGuard for Windows**: Install via winget:
   ```powershell
   winget install WireGuard.WireGuard
   ```
3. **Rust Toolchain**: [rustup.rs](https://rustup.rs) (1.80+ or latest stable).
4. **Node.js**: v18+ (Node 20 or 24 recommended) and npm.
5. **Administrator Rights**: Required for managing Windows VPN network adapters and firewall rules.

---

## Quick Start & Development

1. Clone or open the repository:
   ```powershell
   cd d:\PrivateVPN
   ```

2. Install frontend dependencies:
   ```powershell
   npm install
   ```

3. Launch in development mode with hot reload:
   ```powershell
   npm run tauri dev
   ```

---

## Running Tests

### Rust Unit & Integration Tests
Runs DPAPI encryption/decryption tests, WireGuard config parsing, endpoint validation, CIDR format checks, sensitive key redaction, and SQLite CRUD tests:

```powershell
cd src-tauri
cargo test
cargo test --test integration_tests
```

### Frontend Tests
Runs Vitest unit tests for TypeScript state transitions, models, and metric calculations:

```powershell
npm test
```

---

## Packaging the Windows Desktop Installer

To produce the production `.msi` and `.exe` installer bundles:

```powershell
npm run tauri build
```

Installers will be generated under:
`src-tauri/target/release/bundle/nsis/`

---

## Documentation Index

- [Architecture Overview](docs/architecture.md)
- [Installation & Prerequisites](docs/installation.md)
- [Security & DPAPI Key Storage](docs/security.md)
- [VPN Configuration & Import Guide](docs/vpn-configuration.md)
- [Troubleshooting & Kill Switch Recovery](docs/troubleshooting.md)

---

## Status of Deliverables

- [x] Complete Tauri 2 + Rust + React + TypeScript desktop application
- [x] Official WireGuard for Windows lifecycle integration (`wireguard.exe` tunnel service)
- [x] Windows DPAPI hardware/user-session client private key encryption
- [x] Real multi-endpoint public IP verification with diff detection
- [x] Windows Firewall Kill Switch via `netsh advfirewall` with emergency recovery
- [x] WireGuard `.conf` import with full validation (keys, endpoints, CIDR ranges)
- [x] Sanitized diagnostic console with private key stripping
- [x] Local SQLite storage for preferences, servers, and connection history
- [x] 100% passing Rust unit tests, integration tests, and Vitest frontend tests
- [x] Complete technical and user documentation

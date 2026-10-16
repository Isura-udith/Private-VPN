# Private VPN - Installation and Setup Guide

## System Requirements

- **Operating System**: Windows 10 (64-bit) or Windows 11.
- **Privileges**: Administrator rights are required to manage Windows network adapters and configure the Windows Firewall Kill Switch.
- **WireGuard**: Official [WireGuard for Windows](https://www.wireguard.com/install/) (v0.5.3 or higher recommended).

---

## 1. Prerequisites Setup

### Installing WireGuard for Windows
You can install WireGuard using the Windows Package Manager (`winget`):

```powershell
winget install WireGuard.WireGuard
```

Alternatively, download the official installer directly from:
[https://www.wireguard.com/install/](https://www.wireguard.com/install/)

Verify installation by checking:
```powershell
Test-Path "C:\Program Files\WireGuard\wireguard.exe"
```

### Development Prerequisites
To build and run Private VPN from source:

1. **Rust Toolchain**:
   Install Rust from [rustup.rs](https://rustup.rs):
   ```powershell
   rustc --version
   cargo --version
   ```
2. **Node.js & npm**:
   Node.js v18+ (Node 20 or 24 recommended):
   ```powershell
   node --version
   npm --version
   ```
3. **C++ Build Tools**:
   Microsoft C++ Build Tools (installed with Visual Studio or Visual Studio Build Tools with the Desktop development with C++ workload).

---

## 2. Running in Development Mode

1. Clone or open the repository:
   ```powershell
   cd d:\PrivateVPN
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Launch development mode with hot reload:
   ```powershell
   npm run tauri dev
   ```

> [!NOTE]
> Run your terminal as Administrator if you intend to test real tunnel adapter creation and firewall rule enforcement.

---

## 3. Building the Windows Installer

To build the optimized production release (.msi and .exe installer):

```powershell
npm run tauri build
```

The resulting installers will be generated under:
`src-tauri/target/release/bundle/nsis/` and `src-tauri/target/release/bundle/msi/`.

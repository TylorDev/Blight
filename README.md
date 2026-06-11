<div align="center">
  <img src="src/Resources/BlightAppIcon.png" alt="Blight app icon" width="112" />
  <h1>Blight</h1>

  <p>
    <img alt="Electron" src="https://img.shields.io/badge/Electron-35-47848F?logo=electron&logoColor=white" />
    <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111111" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" />
    <img alt="Vite" src="https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white" />
    <img alt="Prisma" src="https://img.shields.io/badge/Prisma-6.8-2D3748?logo=prisma&logoColor=white" />
    <img alt="Zustand" src="https://img.shields.io/badge/Zustand-5-443E38" />
    <img alt="Sass" src="https://img.shields.io/badge/Sass-1.89-CC6699?logo=sass&logoColor=white" />
    <img alt="Vitest" src="https://img.shields.io/badge/Vitest-4.1-6E9F18?logo=vitest&logoColor=white" />
  </p>
</div>

Blight is a desktop app for tracking crafting economics. It helps manage purchases, inventory, fabrication tickets, TicketXL batches, production results, profitability analysis, and market price comparison from one local Electron application.

The app is designed for users who need a clear view of material investment, stock average costs, crafting taxes, leftovers, produced staff quality, and expected sale profitability.

## Main Features

- Register individual and bulk material purchases.
- Track inventory by material category, tier, quantity, total investment, and average cost.
- Review purchase invoices and invoice line items.
- Create fabrication tickets with recipe, tier, crafting tax, stock cost, and leftover-aware previews.
- Create TicketXL batches across T5, T6, T7, and T8.
- Close tickets with stock validation, filled journals, leftovers, and produced staff quantities.
- Analyze four-ticket XL batches by total cost, gross sale, taxes, net profit, item power, tier, and quality.
- Save and reload TicketAnalizer history snapshots.
- Compare material prices across markets in simple or advanced mode.

## Download For Users

The recommended way to use Blight is to download a packaged build from GitHub Releases.

1. Open the repository Releases page:
   [https://github.com/TylorDev/blight/releases](https://github.com/TylorDev/blight/releases)
2. Download the latest Windows release asset.
3. Choose one of the available package types:
   - Installer (`.exe`): installs Blight and can create desktop/start menu shortcuts.
   - Portable (`.exe`): runs without a full installation.
4. Launch Blight.

### Minimum Requirements

- Operating system: Windows `[pending exact minimum version]`
- Disk space: `[pending]`
- Internet connection: only required to download the release.

Blight stores and manages its data locally through the desktop app. No external marketplace integration or automatic live price import is currently documented.

## Local Development

Use these steps if you want to clone, run, or modify the project locally.

### Prerequisites

- Node.js `[pending supported version]`
- npm
- Git
- Windows is recommended for packaging because the current Electron Builder targets are `nsis` and `portable` for Windows.

### Clone The Repository

```bash
git clone https://github.com/TylorDev/blight.git
cd blight
```

### Install Dependencies

```bash
npm install
```

The `postinstall` script runs Prisma client generation automatically. You can also run it manually:

```bash
npm run prisma:generate
```

### Configure Environment

Copy `.env.example` to `.env` if your local setup requires environment variables:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

The exact required values are `[pending]`; use the existing `.env.example` as the source of truth.

### Prepare The Database

Generate the Prisma client and push the local schema:

```bash
npm run prisma:generate
npm run prisma:push
```

Optional database helpers:

```bash
npm run db:init
npm run prisma:seed
```

### Run In Development

```bash
npm run dev
```

For raw Electron Vite development:

```bash
npm run dev:raw
```

### Build The App

```bash
npm run build
```

### Create Windows Packages

Generate Windows installer and portable release output:

```bash
npm run dist:win
```

Create an unpacked Windows package directory:

```bash
npm run pack:win
```

Build artifacts are written to `dist/`.

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Starts the local development workflow through `scripts/dev.cjs`. |
| `npm run dev:raw` | Starts Electron Vite directly in development mode. |
| `npm run build` | Generates Prisma client, type-checks with TypeScript, and builds with Electron Vite. |
| `npm run dist:win` | Builds the app and creates Windows installer/portable packages with Electron Builder. |
| `npm run pack:win` | Builds the app and creates an unpacked Windows package directory. |
| `npm run test` | Runs the Vitest test suite. |
| `npm run test:generate` | Generates Prisma client, then runs tests. |
| `npm run prisma:generate` | Generates the Prisma client. |
| `npm run prisma:push` | Pushes the Prisma schema to the configured database. |
| `npm run db:init` | Runs the local Prisma initialization script. |
| `npm run prisma:seed` | Runs the Prisma seed script. |

## Project Structure

```text
.
|-- build/              # App packaging assets, including the Windows icon
|-- dist/               # Generated release output
|-- electron/           # Electron main/preload code and desktop data services
|-- prisma/             # Prisma schema and database helper scripts
|-- scripts/            # Development and packaging scripts
|-- src/                # React renderer app, pages, components, stores, and resources
|-- tests/              # Automated tests
|-- PRD.MD              # Product requirements document
`-- package.json        # Project metadata, scripts, dependencies, and build config
```

## Modifying Or Contributing Locally

This project is currently marked as private in `package.json`, but the repository includes the scripts needed for local development and packaging.

Recommended workflow:

1. Create a branch for your change.
2. Keep edits scoped to the feature, bug fix, or documentation update.
3. Run tests when changing business logic:
   ```bash
   npm run test
   ```
4. Run a production build before packaging or release work:
   ```bash
   npm run build
   ```
5. Do not commit generated release artifacts from `dist/` unless the release process explicitly requires it.

For product behavior and feature context, read [PRD.MD](PRD.MD).

## License

`[pending]`

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SaaS platform for selling and managing software licenses to education customers (schools, STEM centers, teachers, students). Providers configure plans (monthly/yearly, user tiers); customers sign electronic contracts; the **contract SHA-256 hash and License Key issue/access events are recorded on a blockchain** for tamper-proofing. Includes realtime chat (Socket.io) with support staff and a Gemini-powered AI chatbot. Docs are written in Vietnamese. The full roadmap (phases P0-P11, data model, API modules, demo script) is in the approved plan at `C:\Users\votra\.claude\plans\soft-wobbling-beacon.md`.

Status: only the scaffold (P0) exists. Auth, plans, contracts, licenses, chat and chatbot are not implemented yet; `contracts/contracts/LicenseRegistry.sol` is a placeholder.

## Layout and commands

npm workspaces at the repo root: `api`, `web`, `contracts`, `shared`. Install once with `npm install` at the root. (The mobile app was dropped; the `web` app is to be responsive/PWA for phone use.)

| Dir | Stack | Notes |
|---|---|---|
| `api/` | NestJS 12 + TypeScript, **ESM** | Backend: REST + Socket.io, will use PostgreSQL, Redis, BullMQ, ethers.js |
| `web/` | React + Vite + TS | Admin dashboard and customer portal |
| `contracts/` | Hardhat 2 + Solidity 0.8.24 (CommonJS) | Smart contracts, OpenZeppelin available |
| `shared/` | Plain TS (`@license-chain/shared`) | Enums/types shared across packages (`Role`, `BillingCycle`, `LicenseStatus`) |

Root scripts: `npm run db:up` / `db:down` (Postgres 16 + Redis 7 via docker compose, Docker Desktop must be running), `api:dev`, `web:dev`, `chain:node` (local Hardhat node), `chain:test`.

Per package (use `-w <dir>` from the root):
- API: `npm run build -w api`, `npm test -w api` (Vitest), single test: `npx vitest run -t "<name>"` or a path, run inside `api/`. e2e: `npm run test:e2e -w api`. Lint: `npm run lint -w api` (oxlint).
- Contracts: `npm run chain:test`, single test: `npx hardhat test test/LicenseRegistry.test.ts` inside `contracts/`. Deploy to local node: `npm run deploy:local -w contracts` (with `chain:node` running).
- Web: `npm run build -w web`.

Config comes from the root `.env` (copy `.env.example`): DB/Redis URLs, JWT secrets, `CHAIN_RPC_URL`, `ISSUER_PRIVATE_KEY`, `LICENSE_REGISTRY_ADDRESS`, `GEMINI_API_KEY`.

## Conventions that are easy to miss

- `api/` is ESM: relative imports must end in `.js`, `__dirname` does not exist (use `import.meta.dirname`), tests use Vitest (`vi.fn()`, not `jest.fn()`), and test files are `*.spec.ts`. `api/AGENTS.md` lists first-party `@nestjs/*` packages to check before adding libraries (TypeORM, bullmq, websockets, config, throttler, schedule...). NestJS here is newer than typical training data; consult https://docs.nestjs.com/llms.txt.
- `contracts/` is CommonJS and uses Hardhat 2 with `@nomicfoundation/hardhat-toolbox` (ethers v6 via `ethers.deployContract`).

## Architecture (big picture)

- **Only hashes go on-chain.** The `LicenseRegistry` contract stores contract hashes and license hashes plus events (`ContractRegistered`, `LicenseIssued/Revoked/Renewed/Accessed`); never raw license keys or personal data. Only the backend's issuer wallet (AccessControl role) may write.
- **Chain writes are asynchronous.** The backend records the row in PostgreSQL as `PENDING`, a queue worker sends the transaction, then stores `tx_hash` and marks it `CONFIRMED`. Do not make request handlers await chain confirmation.
- **Contract verification flow:** PDF generated -> SHA-256 of the bytes -> both parties sign the hash (ECDSA) -> hash registered on-chain; public verify endpoint re-hashes an uploaded file and compares to the on-chain value.
- **Chatbot** lives behind an `LlmProvider` interface with a Gemini implementation, so the provider can be swapped; it is grounded on real `plans` data and KB docs, rate-limited per user, and hands off to a human support agent when unsure.
- Dependency direction: `shared` -> `api` / `web`; `contracts` ABI + address -> `api` (via ethers.js); `web` talks to `api` only through REST/Socket.io.

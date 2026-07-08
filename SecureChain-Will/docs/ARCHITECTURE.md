# Architecture

## High-level flow

```text
+---------------+   REST   +---------------+   HTTP   +---------------+
|   Frontend    | --------> |    Backend    | -------> |    Pinata     |
|  React/Vite   |           | Express/Node  |          |    (IPFS)     |
| + ethers.js   |           |  + MongoDB    |          +---------------+
+-------+-------+           +-------+-------+
        |                           |
        | JSON-RPC (MetaMask)       | JSON-RPC (admin wallet)
        v                           v
+-------------------------------------------------+
|           Ethereum Sepolia Testnet              |
|              WillRegistry.sol                   |
+-------------------------------------------------+
```

## Component responsibilities

| Layer | Responsibility |
|---|---|
| **Frontend** | Wallet connection (MetaMask), file selection, calling backend REST API, calling smart contract functions directly via `ethers.js` for actions that must be signed by the end user (`createWill`, `approveByWitness`). |
| **Backend** | Receives the raw file, encrypts it (AES-256-CBC), pins the encrypted file to IPFS via Pinata, computes SHA-256 hash, persists metadata in MongoDB, exposes REST endpoints, and executes admin-signed on-chain transactions (`verifyDeath`, `releaseWill`) using a server-held admin key. |
| **Smart Contract** | Source of truth for will status and access control. Stores only CID + hash + participant addresses + status - never the document itself. |
| **IPFS / Pinata** | Stores the encrypted document blobs off-chain; content-addressed by CID. |
| **MongoDB** | Fast-query mirror of on-chain state plus off-chain-only fields (original filename, mime type) for UI convenience. The chain remains authoritative for status transitions in production use. |

## Data flow: creating a will

1. Creator connects MetaMask (frontend) and logs in (signs a message, backend issues JWT).
2. Creator fills out the upload form (file, witness wallet, beneficiary wallet).
3. Frontend `POST /api/uploadWill` -> backend encrypts file -> uploads encrypted file to Pinata -> computes hash -> saves Mongo record -> returns `{ cid, hash }`.
4. Frontend calls `WillRegistry.createWill(witness, beneficiary, cid, hash)` directly via MetaMask (creator signs & pays gas).
5. Frontend reads the `WillCreated` event log to get the on-chain `id`, then `POST /api/uploadWill/:mongoId/onchain` to link the two records.

## Data flow: release

1. Witness logs in, sees assigned wills, calls `approveByWitness(id)` on-chain (witness signs), and the backend mirrors status via `POST /api/will/:id/witness-approve`.
2. Admin calls `POST /api/verify` -> backend calls `verifyDeath(id)` on-chain using the admin wallet configured in `ADMIN_PRIVATE_KEY`.
3. Admin calls `POST /api/release` -> backend calls `releaseWill(id)` on-chain.
4. Beneficiary logs in; `GET /api/myWills` now includes the released will; `GET /api/will/:id` returns a `gatewayUrl` to fetch the encrypted document from IPFS.

## Security boundaries

- The document itself never touches the blockchain - only its hash and CID.
- Only the encrypted file is ever pinned to IPFS.
- Contract-level modifiers (`onlyAdmin`, `onlyCreator`, `onlyWitness`, `onlyBeneficiary`) enforce role checks on-chain; the backend re-checks the same roles for defense in depth.
- The backend's `ADMIN_PRIVATE_KEY` should be a dedicated, low-value hot wallet - never a wallet holding real funds - and must never be committed to source control.

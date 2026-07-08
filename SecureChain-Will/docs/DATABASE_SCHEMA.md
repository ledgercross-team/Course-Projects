# Database Schema (MongoDB)

## Collection: `users`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `name` | String | Required |
| `email` | String | Required, unique, lowercased |
| `wallet` | String | Required, unique, lowercased, must match `^0x[a-fA-F0-9]{40}$` |
| `role` | String enum | `creator` \| `witness` \| `admin` \| `beneficiary` (default `creator`) |
| `createdAt` | Date | Auto-set |

## Collection: `wills`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Primary key (Mongo-side id, used in REST URLs) |
| `onChainId` | Number \| null | The `uint256 id` returned by `WillRegistry.createWill()`; null until confirmed on-chain |
| `creatorWallet` | String | Lowercased wallet address |
| `witnessWallet` | String | Lowercased wallet address |
| `beneficiaryWallet` | String | Lowercased wallet address |
| `cid` | String | IPFS CID of the **encrypted** document |
| `hash` | String | `sha256:<hex>` of the encrypted document |
| `originalFileName` | String | For display purposes only |
| `mimeType` | String | `application/pdf` \| `image/jpeg` \| `image/png` |
| `status` | String enum | `Created` \| `WitnessApproved` \| `Verified` \| `Released` \| `Rejected` |
| `createdAt` / `updatedAt` | Date | Auto-set |

### Indexes (recommended)

```js
db.users.createIndex({ wallet: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.wills.createIndex({ creatorWallet: 1 });
db.wills.createIndex({ witnessWallet: 1 });
db.wills.createIndex({ beneficiaryWallet: 1 });
db.wills.createIndex({ onChainId: 1 });
```

## On-chain struct (source of truth for status)

```solidity
struct Will {
    uint256 id;
    address creator;
    address witness;
    address beneficiary;
    string ipfsCID;
    string documentHash;
    WillStatus status; // enum: Created, WitnessApproved, Verified, Released, Rejected*
    uint256 createdAt;
}
```

*Note: `Rejected` exists in MongoDB and as a witness action (`rejectByWitness`) but is
not part of the linear happy-path status progression described in the original
spec's `WillStatus` enum - it's an added safety valve so a witness can decline
without leaving the will stuck.

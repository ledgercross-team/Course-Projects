# API Documentation

Base URL: `http://localhost:5000/api`

All authenticated routes require a header:
```
Authorization: Bearer <JWT>
```

---

## Auth

### `POST /register`
Registers a new user tied to a wallet address.

**Body**
```json
{ "name": "Alice", "email": "alice@example.com", "wallet": "0xabc...", "role": "creator" }
```

**Response `201`**
```json
{ "success": true, "token": "...", "user": { "_id": "...", "name": "Alice", "wallet": "0xabc...", "role": "creator" } }
```

### `POST /login`
Verifies a signed message to prove wallet ownership, then issues a JWT.

**Body**
```json
{ "wallet": "0xabc...", "message": "Sign in to SecureChain Will\n...", "signature": "0x..." }
```

**Response `200`**
```json
{ "success": true, "token": "...", "user": { "...": "..." } }
```

---

## Wills

### `POST /uploadWill` - role: `creator`
`multipart/form-data`: `file` (PDF/JPG/PNG, <=20MB), `witnessWallet`, `beneficiaryWallet`.

Encrypts the file, pins it to IPFS, computes its hash, and stores a Mongo record.

**Response `201`**
```json
{
  "success": true,
  "will": { "_id": "...", "status": "Created", "...": "..." },
  "cid": "bafy...",
  "hash": "sha256:...",
  "gatewayUrl": "https://gateway.pinata.cloud/ipfs/bafy...",
  "message": "Encrypted document pinned to IPFS. Call createWill() on-chain with this CID and hash."
}
```

### `POST /uploadWill/:id/onchain` - role: `creator`
Links a Mongo will record to its on-chain id after `createWill()` confirms.

**Body**: `{ "onChainId": 1 }`

### `POST /will/:id/witness-approve` - role: `witness`
Off-chain mirror of the on-chain `approveByWitness()` call.

### `GET /will/:id` - authenticated
Returns a single will if the requester is the creator, witness, admin, or
(post-release) the beneficiary. Includes `gatewayUrl` when access is permitted.

### `GET /myWills` - authenticated
Returns wills scoped to the caller's wallet/role:
- `creator` -> wills they created
- `witness` -> wills they're assigned to
- `beneficiary` -> **only released** wills naming them
- `admin` -> all wills

### `POST /verify` - role: `admin`
**Body**: `{ "willId": "<mongoId>", "onChainId": 1 }`
Marks death/condition verified in MongoDB and calls `verifyDeath()` on-chain.

### `POST /release` - role: `admin`
**Body**: `{ "willId": "<mongoId>", "onChainId": 1 }`
Marks the will released in MongoDB and calls `releaseWill()` on-chain.

---

## Error format

All errors return:
```json
{ "success": false, "message": "Human-readable reason" }
```

Common status codes: `400` validation, `401` auth, `403` role/access, `404` not found, `409` conflict, `500` server error.

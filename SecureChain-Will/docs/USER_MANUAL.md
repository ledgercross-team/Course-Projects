# User Manual

## Prerequisites for all users
- A MetaMask wallet installed in your browser.
- Some Sepolia testnet ETH in that wallet (for gas - get some from a
  Sepolia faucet if deploying/testing against the real testnet).
- Register once with your name, email, wallet address, and role.

## Creator

1. Go to **Login -> Register**, connect MetaMask, choose role `creator`.
2. From **My Wills**, click **Upload New Will**.
3. Select your scanned will file (PDF, JPG, or PNG, up to 20MB).
4. Enter the wallet address of your chosen **witness** and **beneficiary**.
5. Submit. The app will:
   - Encrypt and pin your document to IPFS.
   - Ask MetaMask to confirm a transaction registering the will on-chain.
6. You can review your wills any time from **My Wills**; each shows its
   current status (Created -> Witness Approved -> Verified -> Released).
7. You may update a will's document only while its status is still `Created`
   (before the witness has acted).

## Witness

1. Register with role `witness` using the wallet address the creator named.
2. Go to **Assigned Wills** to see wills awaiting your review.
3. Click **Approve** to confirm you witnessed the will. This requires a
   MetaMask signature (on-chain `approveByWitness`).
4. Once approved, the will moves to `Witness Approved` and awaits admin
   verification.

## Admin

1. Register with role `admin` (in a real deployment this would be restricted
   to the contract's designated `admin` address).
2. Go to **Admin Panel** to see all wills across the system.
3. For a `Witness Approved` will, click **Verify Death** once you've
   confirmed (through your organization's process) that the relevant
   condition has occurred.
4. For a `Verified` will, click **Release Will** to make it available to the
   beneficiary.

## Beneficiary

1. Register with role `beneficiary` using the wallet address the creator
   named.
2. Once a will naming you is released, it appears under **Released Wills**.
3. Click **View**, then **Download Encrypted Document** to retrieve the file
   from IPFS. (In this prototype, decryption for authorized recipients is
   handled by the backend's key-holder; a production system would use
   per-recipient key wrapping instead of a single shared AES key.)

## Troubleshooting

| Issue | Likely cause |
|---|---|
| "MetaMask is not installed" | Install the MetaMask browser extension. |
| Wrong network prompt | The app expects Sepolia; approve the network switch prompt. |
| "Unsupported file type" | Only PDF, JPG, and PNG are accepted. |
| "File exceeds the 20MB limit" | Compress or re-scan at lower resolution. |
| 403 Access denied on a will | You're not the creator/witness/admin, or the will hasn't been released to you yet. |

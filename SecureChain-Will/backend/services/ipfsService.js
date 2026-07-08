const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const FormData = require("form-data");
const pinataConfig = require("../config/pinata");

const localIpfsDir = path.join(__dirname, "..", "local-ipfs");

function hasUsableSecret(value) {
  return Boolean(value && !String(value).startsWith("replace_with"));
}

function shouldUseLocalIpfs() {
  const hasJwt = hasUsableSecret(pinataConfig.jwt);
  const hasKeyPair = hasUsableSecret(pinataConfig.apiKey) && hasUsableSecret(pinataConfig.apiSecret);
  return !hasJwt && !hasKeyPair && process.env.NODE_ENV !== "production";
}

function getPinataHeaders(extraHeaders = {}) {
  if (hasUsableSecret(pinataConfig.jwt)) {
    return { Authorization: `Bearer ${pinataConfig.jwt}`, ...extraHeaders };
  }

  if (!hasUsableSecret(pinataConfig.apiKey) || !hasUsableSecret(pinataConfig.apiSecret)) {
    throw new Error("Pinata credentials missing: set PINATA_JWT or PINATA_API_KEY and PINATA_API_SECRET");
  }

  return {
    pinata_api_key: pinataConfig.apiKey,
    pinata_secret_api_key: pinataConfig.apiSecret,
    ...extraHeaders,
  };
}

async function createLocalCid(filePath) {
  const buffer = await fsp.readFile(filePath);
  return `local-${crypto.createHash("sha256").update(buffer).digest("hex")}`;
}

/// Uploads an (already encrypted) file to IPFS via Pinata and returns the CID.
async function uploadToIPFS(filePath, fileName) {
  if (shouldUseLocalIpfs()) {
    const cid = await createLocalCid(filePath);
    await fsp.mkdir(localIpfsDir, { recursive: true });
    await fsp.copyFile(filePath, path.join(localIpfsDir, cid));
    return cid;
  }

  const data = new FormData();
  data.append("file", fs.createReadStream(filePath), fileName);
  data.append(
    "pinataMetadata",
    JSON.stringify({ name: fileName, keyvalues: { app: "SecureChainWill" } })
  );
  data.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const headers = getPinataHeaders(data.getHeaders());

  const response = await axios.post(pinataConfig.pinFileUrl, data, {
    maxBodyLength: Infinity,
    headers,
  });

  return response.data.IpfsHash; // CID
}

/// Unpins a file from Pinata (e.g. if a will is deleted before approval).
async function unpinFromIPFS(cid) {
  if (cid?.startsWith("local-")) {
    await fsp.rm(path.join(localIpfsDir, cid), { force: true });
    return;
  }

  const headers = getPinataHeaders();

  await axios.delete(pinataConfig.unpinUrl(cid), { headers });
}

function gatewayUrlFor(cid) {
  if (cid?.startsWith("local-")) {
    const origin = process.env.PUBLIC_API_ORIGIN || `http://localhost:${process.env.PORT || 5000}`;
    return `${origin}/local-ipfs/${cid}`;
  }

  return `${pinataConfig.gatewayUrl}/${cid}`;
}

module.exports = { uploadToIPFS, unpinFromIPFS, gatewayUrlFor };

const { normalizeGatewayUrl } = require("./env");

module.exports = {
  apiKey: process.env.PINATA_API_KEY,
  apiSecret: process.env.PINATA_API_SECRET,
  jwt: process.env.PINATA_JWT,
  gatewayUrl: normalizeGatewayUrl(process.env.PINATA_GATEWAY_URL),
  pinFileUrl: "https://api.pinata.cloud/pinning/pinFileToIPFS",
  unpinUrl: (cid) => `https://api.pinata.cloud/pinning/unpin/${cid}`,
};

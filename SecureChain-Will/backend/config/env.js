function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requireHexEnv(name, expectedLength) {
  const value = requireEnv(name);
  if (!new RegExp(`^[a-fA-F0-9]{${expectedLength}}$`).test(value)) {
    throw new Error(`${name} must be a ${expectedLength}-character hex string`);
  }
  return value;
}

function normalizeGatewayUrl(url) {
  return String(url || "https://gateway.pinata.cloud/ipfs").replace(/\/+$/, "");
}

module.exports = {
  requireEnv,
  requireHexEnv,
  normalizeGatewayUrl,
};

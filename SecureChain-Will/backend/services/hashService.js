const crypto = require("crypto");
const fs = require("fs");

/// Computes the SHA-256 hash of a file on disk, returned as a hex string
/// prefixed with "sha256:" for clarity when stored on-chain / in Mongo.
function computeFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(`sha256:${hash.digest("hex")}`));
    stream.on("error", reject);
  });
}

module.exports = { computeFileHash };

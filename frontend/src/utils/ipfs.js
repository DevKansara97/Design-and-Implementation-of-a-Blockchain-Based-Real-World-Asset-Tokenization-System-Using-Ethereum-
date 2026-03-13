// frontend/src/utils/ipfs.js
// Uses Pinata (https://pinata.cloud) for IPFS pinning — free tier: 1GB

const PINATA_API_KEY    = process.env.REACT_APP_PINATA_API_KEY    || "";
const PINATA_SECRET_KEY = process.env.REACT_APP_PINATA_SECRET     || "";
const PINATA_BASE_URL   = "https://api.pinata.cloud";

/**
 * Upload a file to IPFS via Pinata and return its CID.
 * @param {File} file - File object from HTML input
 * @returns {Promise<string>} IPFS CID (e.g. "QmXxxx...")
 */
export async function uploadFileToIPFS(file) {
  const formData = new FormData();
  formData.append("file", file);

  const metadata = JSON.stringify({ name: file.name });
  formData.append("pinataMetadata", metadata);

  const response = await fetch(`${PINATA_BASE_URL}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      pinata_api_key:        PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error("IPFS upload failed: " + (err.error || response.statusText));
  }

  const data = await response.json();
  return data.IpfsHash; // CID
}

/**
 * Upload JSON metadata to IPFS via Pinata.
 * @param {object} metadata - Asset metadata object
 * @returns {Promise<string>} IPFS CID
 */
export async function uploadMetadataToIPFS(metadata) {
  const response = await fetch(`${PINATA_BASE_URL}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      "Content-Type":        "application/json",
      pinata_api_key:        PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY,
    },
    body: JSON.stringify({
      pinataContent:  metadata,
      pinataMetadata: { name: `RWA-${metadata.assetId}` },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error("Metadata upload failed: " + (err.error || response.statusText));
  }

  const data = await response.json();
  return data.IpfsHash;
}

/**
 * Construct IPFS gateway URL from CID.
 */
export function ipfsUrl(cid) {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

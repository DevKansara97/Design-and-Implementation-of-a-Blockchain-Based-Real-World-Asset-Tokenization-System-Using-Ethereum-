// frontend/src/utils/contract.js
// After deploying, paste your contract address in .env as REACT_APP_CONTRACT_ADDRESS

export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "";

// Full ABI for RWATokenization.sol
export const CONTRACT_ABI = [
  // ─── Events ───────────────────────────────────────────────────────────────
  "event AssetRegistered(uint256 indexed tokenId, string indexed assetId, address indexed owner, string assetType, string ipfsCID, uint256 timestamp)",
  "event AssetVerified(uint256 indexed tokenId, string indexed assetId, address indexed verifier, uint256 timestamp)",
  "event AssetTransferred(uint256 indexed tokenId, string indexed assetId, address indexed from, address to, uint256 timestamp)",

  // ─── View Functions ───────────────────────────────────────────────────────
  "function totalAssets() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getAsset(uint256 tokenId) view returns (tuple(uint256 tokenId, string assetId, string assetType, string ipfsCID, address issuer, bool isVerified, uint256 registeredAt, uint256 verifiedAt))",
  "function getTokenIdByAssetId(string assetId) view returns (uint256)",
  "function isAssetVerified(uint256 tokenId) view returns (bool)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function tokenURI(uint256 tokenId) view returns (string)",

  // ─── Write Functions ──────────────────────────────────────────────────────
  "function registerAsset(address to, string assetId, string assetType, string ipfsCID) returns (uint256)",
  "function verifyAsset(uint256 tokenId)",
  "function transferAsset(address to, uint256 tokenId)",
  "function grantRole(bytes32 role, address account)",
];

export const ROLES = {
  ISSUER_ROLE:   "0x114e74f6ea3bd819998f78687bfcb11b140da08e3ce6ef9f83edc0f8f6c55f46",
  VERIFIER_ROLE: "0x0ce23c3e399818cfee81a7ab0880f714e53d7672b08df0fa62f2843416e1ea09",
  ADMIN_ROLE:    "0x0000000000000000000000000000000000000000000000000000000000000000",
};

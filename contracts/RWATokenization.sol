// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title RWATokenization
 * @dev Real-World Asset Tokenization System using ERC-721 (NFT) on Ethereum
 * @notice Group IBC02 - CSE542 Introduction to Blockchain
 */
contract RWATokenization is ERC721URIStorage, AccessControl {
    // ─── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = DEFAULT_ADMIN_ROLE;
    bytes32 public constant ISSUER_ROLE   = keccak256("ISSUER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // ─── State ─────────────────────────────────────────────────────────────────
    // Simple counter — Counters.sol was removed in OpenZeppelin v5
    uint256 private _tokenIdCounter;

    struct Asset {
        uint256 tokenId;
        string  assetId;       // Human-readable unique ID (e.g. "PROP-001")
        string  assetType;     // e.g. "RealEstate", "Gold", "Artwork"
        string  ipfsCID;       // IPFS content identifier for metadata
        address issuer;
        bool    isVerified;
        uint256 registeredAt;
        uint256 verifiedAt;
    }

    // tokenId => Asset
    mapping(uint256 => Asset) public assets;

    // human assetId => tokenId  (prevent duplicate assetIds)
    mapping(string => uint256) private _assetIdToTokenId;
    mapping(string => bool)    private _assetIdExists;

    // ─── Events ───────────────────────────────────────────────────────────────
    event AssetRegistered(
        uint256 indexed tokenId,
        string  indexed assetId,
        address indexed owner,
        string  assetType,
        string  ipfsCID,
        uint256 timestamp
    );

    event AssetVerified(
        uint256 indexed tokenId,
        string  indexed assetId,
        address indexed verifier,
        uint256 timestamp
    );

    event AssetTransferred(
        uint256 indexed tokenId,
        string  indexed assetId,
        address indexed from,
        address to,
        uint256 timestamp
    );

    event RoleGrantedCustom(
        bytes32 indexed role,
        address indexed account,
        address indexed grantor
    );

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor() ERC721("RealWorldAsset", "RWA") {
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────
    // In OZ v5, _exists() was removed — use _ownerOf() != address(0) instead
    modifier assetExists(uint256 tokenId) {
        require(_ownerOf(tokenId) != address(0), "Asset does not exist");
        _;
    }

    modifier onlyAssetOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not the asset owner");
        _;
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    /**
     * @notice Grant a role to an account (Admin only)
     */
    function grantRole(bytes32 role, address account)
        public
        override
        onlyRole(ADMIN_ROLE)
    {
        _grantRole(role, account);
        emit RoleGrantedCustom(role, account, msg.sender);
    }

    // ─── Issuer Functions ─────────────────────────────────────────────────────

    /**
     * @notice Register a new real-world asset as an NFT
     * @param to         Recipient / initial owner address
     * @param assetId    Unique human-readable identifier for the asset
     * @param assetType  Type of asset (e.g. "RealEstate", "Artwork")
     * @param ipfsCID    IPFS CID pointing to the asset metadata JSON
     * @return tokenId   The minted token ID
     */
    function registerAsset(
        address to,
        string calldata assetId,
        string calldata assetType,
        string calldata ipfsCID
    ) external onlyRole(ISSUER_ROLE) returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(bytes(assetId).length > 0, "Asset ID required");
        require(bytes(ipfsCID).length > 0, "IPFS CID required");
        require(!_assetIdExists[assetId], "Asset ID already registered");

        _tokenIdCounter += 1;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, string(abi.encodePacked("ipfs://", ipfsCID)));

        assets[tokenId] = Asset({
            tokenId:      tokenId,
            assetId:      assetId,
            assetType:    assetType,
            ipfsCID:      ipfsCID,
            issuer:       msg.sender,
            isVerified:   false,
            registeredAt: block.timestamp,
            verifiedAt:   0
        });

        _assetIdToTokenId[assetId] = tokenId;
        _assetIdExists[assetId] = true;

        emit AssetRegistered(tokenId, assetId, to, assetType, ipfsCID, block.timestamp);
        return tokenId;
    }

    // ─── Verifier Functions ───────────────────────────────────────────────────

    /**
     * @notice Verify an asset (marks it as verified)
     * @param tokenId The NFT token ID of the asset
     */
    function verifyAsset(uint256 tokenId)
        external
        onlyRole(VERIFIER_ROLE)
        assetExists(tokenId)
    {
        require(!assets[tokenId].isVerified, "Asset already verified");

        assets[tokenId].isVerified  = true;
        assets[tokenId].verifiedAt  = block.timestamp;

        emit AssetVerified(tokenId, assets[tokenId].assetId, msg.sender, block.timestamp);
    }

    // ─── Owner Functions ──────────────────────────────────────────────────────

    /**
     * @notice Transfer asset ownership to another address
     * @dev Asset must be verified before it can be transferred
     * @param to      Recipient address
     * @param tokenId Token ID of the asset
     */
    function transferAsset(address to, uint256 tokenId)
        external
        assetExists(tokenId)
        onlyAssetOwner(tokenId)
    {
        require(assets[tokenId].isVerified, "Asset must be verified before transfer");
        require(to != address(0), "Cannot transfer to zero address");

        address from = ownerOf(tokenId);
        _transfer(from, to, tokenId);

        emit AssetTransferred(tokenId, assets[tokenId].assetId, from, to, block.timestamp);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /**
     * @notice Get full asset details by token ID
     */
    function getAsset(uint256 tokenId)
        external
        view
        assetExists(tokenId)
        returns (Asset memory)
    {
        return assets[tokenId];
    }

    /**
     * @notice Lookup token ID by human-readable asset ID
     */
    function getTokenIdByAssetId(string calldata assetId)
        external
        view
        returns (uint256)
    {
        require(_assetIdExists[assetId], "Asset ID not found");
        return _assetIdToTokenId[assetId];
    }

    /**
     * @notice Get total number of registered assets
     */
    function totalAssets() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @notice Check if an asset is verified
     */
    function isAssetVerified(uint256 tokenId)
        external
        view
        assetExists(tokenId)
        returns (bool)
    {
        return assets[tokenId].isVerified;
    }

    // ─── Overrides ────────────────────────────────────────────────────────────
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

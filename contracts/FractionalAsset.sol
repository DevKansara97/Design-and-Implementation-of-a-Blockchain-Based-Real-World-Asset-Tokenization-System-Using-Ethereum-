// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FractionalAsset
 * @dev Represents fractional (shared) ownership of a real-world asset via ERC-20 tokens.
 *      Deploy one instance per asset that requires fractional ownership.
 * @notice Group IBC02 - CSE542 Introduction to Blockchain
 */
contract FractionalAsset is ERC20, Ownable {
    // ─── State ─────────────────────────────────────────────────────────────────
    string  public assetId;        // Human-readable asset identifier
    string  public assetType;      // e.g. "RealEstate", "Gold"
    string  public ipfsCID;        // IPFS CID for metadata
    bool    public isVerified;
    uint256 public totalShares;    // Total fractional shares (= totalSupply)

    // ─── Events ───────────────────────────────────────────────────────────────
    event AssetVerified(address indexed verifier, uint256 timestamp);
    event SharesIssued(address indexed to, uint256 amount, uint256 timestamp);
    event SharesTransferred(address indexed from, address indexed to, uint256 amount, uint256 timestamp);

    // ─── Constructor ──────────────────────────────────────────────────────────
    /**
     * @param _assetId   Unique asset identifier
     * @param _assetType Type of asset
     * @param _ipfsCID   IPFS CID for metadata
     * @param _shares    Total fractional shares to mint
     * @param _owner     Initial owner (receives all shares)
     */
    constructor(
        string memory _assetId,
        string memory _assetType,
        string memory _ipfsCID,
        uint256 _shares,
        address _owner
    ) ERC20(
        string(abi.encodePacked("RWA-", _assetId)),
        string(abi.encodePacked("F-", _assetId))
    ) Ownable(_owner) {
        require(_shares > 0, "Shares must be > 0");
        assetId   = _assetId;
        assetType = _assetType;
        ipfsCID   = _ipfsCID;
        totalShares = _shares;

        _mint(_owner, _shares);
        emit SharesIssued(_owner, _shares, block.timestamp);
    }

    // ─── Owner Functions ──────────────────────────────────────────────────────

    /**
     * @notice Mark asset as verified (called by verifying authority)
     */
    function verify() external onlyOwner {
        require(!isVerified, "Already verified");
        isVerified = true;
        emit AssetVerified(msg.sender, block.timestamp);
    }

    /**
     * @notice Transfer shares to another address
     */
    function transferShares(address to, uint256 amount) external returns (bool) {
        bool success = transfer(to, amount);
        if (success) {
            emit SharesTransferred(msg.sender, to, amount, block.timestamp);
        }
        return success;
    }

    /**
     * @notice Get ownership percentage (scaled by 1e4 = basis points)
     */
    function ownershipPercentage(address account) external view returns (uint256) {
        if (totalSupply() == 0) return 0;
        return (balanceOf(account) * 10000) / totalSupply();
    }
}

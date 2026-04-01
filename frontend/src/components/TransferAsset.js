// frontend/src/components/TransferAsset.js
import React, { useState } from "react";
import { ethers } from "ethers";

export default function TransferAsset({ contract }) {
  const [tokenId, setTokenId] = useState("");
  const [toAddr,  setToAddr]  = useState("");
  const [asset,   setAsset]   = useState(null);
  const [status,  setStatus]  = useState("");
  const [txHash,  setTxHash]  = useState("");
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    if (!tokenId) return;
    setStatus("");
    setAsset(null);
    try {
      const [a, owner, signerAddr] = await Promise.all([
        contract.getAsset(BigInt(tokenId)),
        contract.ownerOf(BigInt(tokenId)),
        contract.runner.getAddress(),
      ]);
      
      // Properly unpack the asset struct from ethers
      const assetData = {
        tokenId: a[0],
        assetId: a[1],
        assetType: a[2],
        ipfsCID: a[3],
        issuer: a[4],
        isVerified: a[5],
        registeredAt: a[6],
        verifiedAt: a[7],
        ownerAddress: owner,
        signerAddress: signerAddr,
      };
      
      setAsset(assetData);
      setStatus(""); // Clear any previous status
    } catch (e) {
      setStatus("❌ Asset not found: " + (e.reason || e.message));
      setAsset(null);
    }
  };

  const handleTransfer = async () => {
    if (!tokenId || !toAddr) return;
    setLoading(true);
    setTxHash("");
    setStatus("Sending transfer transaction...");
    try {
      // Validate and normalize the address (prevent ENS resolution attempts)
      const normalizedAddr = ethers.getAddress(toAddr);
      
      const tx = await contract.transferAsset(normalizedAddr, BigInt(tokenId));
      setTxHash(tx.hash);
      setStatus("Waiting for confirmation...");
      await tx.wait();
      setStatus("✅ Asset transferred successfully!");
      // Refresh asset data
      const [a, owner, signerAddr] = await Promise.all([
        contract.getAsset(BigInt(tokenId)),
        contract.ownerOf(BigInt(tokenId)),
        contract.runner.getAddress(),
      ]);
      
      const assetData = {
        tokenId: a[0],
        assetId: a[1],
        assetType: a[2],
        ipfsCID: a[3],
        issuer: a[4],
        isVerified: a[5],
        registeredAt: a[6],
        verifiedAt: a[7],
        ownerAddress: owner,
        signerAddress: signerAddr,
      };
      
      setAsset(assetData);
    } catch (e) {
      setStatus("❌ " + (e.reason || e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>🔁 Transfer Asset</h2>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Transfer ownership of a verified asset to another wallet address. You must be the current owner.
      </p>

      <div className="form-group">
        <label>Token ID</label>
        <input
          type="number"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          placeholder="1"
          onKeyDown={(e) => e.key === "Enter" && handleFetch()}
        />
      </div>

      <button className="primary" onClick={handleFetch} disabled={!tokenId}>
        Fetch Asset
      </button>

      {asset && (
        <button 
          className="secondary" 
          onClick={handleFetch} 
          style={{ marginLeft: "0.5rem" }}
          title="Refresh asset data"
        >
          🔄 Refresh
        </button>
      )}

      {asset && (
        <div className="asset-card" style={{ marginTop: "1.5rem" }}>
          <div className="asset-header">
            <div>
              <div className="asset-id">{asset.assetId}</div>
              <div className="asset-type">{asset.assetType}</div>
            </div>
            <span className={`badge ${asset.isVerified ? "verified" : "unverified"}`}>
              {asset.isVerified ? "✅ Verified" : "⚠️ Not Verified"}
            </span>
          </div>
          <div className="asset-field">
            Current Owner:{" "}
            <span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{asset.ownerAddress}</span>
          </div>

          {asset.isVerified && (
            <>
              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label>Transfer To (wallet address)</label>
                <input
                  value={toAddr}
                  onChange={(e) => setToAddr(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              
              {asset.ownerAddress && asset.signerAddress && 
               asset.ownerAddress.toLowerCase() !== asset.signerAddress.toLowerCase() && (
                <div className="alert warning" style={{ marginTop: "0.5rem" }}>
                  ⚠️ You are not the owner of this asset. Only the owner can transfer it.
                </div>
              )}
              
              <button 
                className="primary" 
                onClick={handleTransfer} 
                disabled={loading || !toAddr || (asset.ownerAddress && asset.signerAddress && asset.ownerAddress.toLowerCase() !== asset.signerAddress.toLowerCase())}
              >
                {loading ? "Transferring..." : "Transfer Ownership"}
              </button>
            </>
          )}

          {!asset.isVerified && (
            <div className="alert error" style={{ marginTop: "1rem" }}>
              Asset must be verified by a Verifier before it can be transferred.
            </div>
          )}
        </div>
      )}

      {status && (
        <div className={`alert ${status.startsWith("✅") ? "success" : status.startsWith("❌") ? "error" : "info"}`}>
          {status}
          {txHash && (
            <div style={{ marginTop: 6, fontSize: "0.8rem", wordBreak: "break-all" }}>
              Tx: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: "#a78bfa" }}>{txHash}</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

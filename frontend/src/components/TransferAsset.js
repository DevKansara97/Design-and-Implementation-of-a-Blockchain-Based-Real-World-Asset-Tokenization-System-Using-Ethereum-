// frontend/src/components/TransferAsset.js
import React, { useState } from "react";

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
      const [a, owner] = await Promise.all([
        contract.getAsset(BigInt(tokenId)),
        contract.ownerOf(BigInt(tokenId)),
      ]);
      setAsset({ ...a, ownerAddress: owner });
    } catch (e) {
      setStatus("❌ Asset not found: " + (e.reason || e.message));
    }
  };

  const handleTransfer = async () => {
    if (!tokenId || !toAddr) return;
    setLoading(true);
    setTxHash("");
    setStatus("Sending transfer transaction...");
    try {
      const tx = await contract.transferAsset(toAddr, BigInt(tokenId));
      setTxHash(tx.hash);
      setStatus("Waiting for confirmation...");
      await tx.wait();
      setStatus("✅ Asset transferred successfully!");
      // Refresh
      const [a, owner] = await Promise.all([
        contract.getAsset(BigInt(tokenId)),
        contract.ownerOf(BigInt(tokenId)),
      ]);
      setAsset({ ...a, ownerAddress: owner });
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
              <button className="primary" onClick={handleTransfer} disabled={loading || !toAddr}>
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

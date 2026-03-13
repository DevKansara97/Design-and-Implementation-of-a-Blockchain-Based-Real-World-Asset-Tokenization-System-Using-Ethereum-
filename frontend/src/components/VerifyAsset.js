// frontend/src/components/VerifyAsset.js
import React, { useState } from "react";
import { ipfsUrl } from "../utils/ipfs";

export default function VerifyAsset({ contract }) {
  const [tokenId, setTokenId] = useState("");
  const [asset,   setAsset]   = useState(null);
  const [status,  setStatus]  = useState("");
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    if (!tokenId) return;
    setStatus("");
    setAsset(null);
    try {
      const a = await contract.getAsset(BigInt(tokenId));
      setAsset(a);
    } catch (e) {
      setStatus("❌ " + (e.reason || "Asset not found"));
    }
  };

  const handleVerify = async () => {
    if (!tokenId) return;
    setLoading(true);
    setStatus("Sending verification transaction...");
    try {
      const tx = await contract.verifyAsset(BigInt(tokenId));
      setStatus("Waiting for confirmation...");
      await tx.wait();
      setStatus("✅ Asset verified successfully!");
      // Refresh asset data
      const a = await contract.getAsset(BigInt(tokenId));
      setAsset(a);
    } catch (e) {
      setStatus("❌ " + (e.reason || e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>✅ Verify Asset</h2>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        As a Verifier, you can mark an asset as verified so it can be transferred.
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
              {asset.isVerified ? "✅ Already Verified" : "⏳ Pending Verification"}
            </span>
          </div>
          <div className="asset-field">
            IPFS:{" "}
            <a href={ipfsUrl(asset.ipfsCID)} target="_blank" rel="noreferrer" style={{ color: "#6c63ff" }}>
              View Metadata
            </a>
          </div>

          {!asset.isVerified && (
            <button
              className="primary"
              onClick={handleVerify}
              disabled={loading}
              style={{ marginTop: "1rem" }}
            >
              {loading ? "Verifying..." : "Mark as Verified"}
            </button>
          )}
        </div>
      )}

      {status && (
        <div className={`alert ${status.startsWith("✅") ? "success" : status.startsWith("❌") ? "error" : "info"}`}>
          {status}
        </div>
      )}
    </div>
  );
}

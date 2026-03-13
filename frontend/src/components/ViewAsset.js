// frontend/src/components/ViewAsset.js
import React, { useState } from "react";
import { ipfsUrl } from "../utils/ipfs";

export default function ViewAsset({ contract }) {
  const [input,  setInput]  = useState("");
  const [asset,  setAsset]  = useState(null);
  const [owner,  setOwner]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,  setError]  = useState("");

  const handleSearch = async () => {
    if (!contract || !input.trim()) return;
    setLoading(true);
    setError("");
    setAsset(null);

    try {
      let tokenId;

      // If input looks like a number, treat as tokenId; otherwise look up by assetId
      if (/^\d+$/.test(input.trim())) {
        tokenId = BigInt(input.trim());
      } else {
        tokenId = await contract.getTokenIdByAssetId(input.trim());
      }

      const [a, o] = await Promise.all([
        contract.getAsset(tokenId),
        contract.ownerOf(tokenId),
      ]);

      setAsset(a);
      setOwner(o);
    } catch (e) {
      setError("Asset not found: " + (e.reason || e.message));
    } finally {
      setLoading(false);
    }
  };

  const fmt = (ts) => ts > 0 ? new Date(Number(ts) * 1000).toLocaleString() : "—";

  return (
    <div className="card">
      <h2>🔍 View Asset Details</h2>

      <div className="form-group">
        <label>Token ID or Asset ID (e.g. 1 or PROP-001)</label>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter token ID or asset ID"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>

      <button className="primary" onClick={handleSearch} disabled={loading}>
        {loading ? "Searching..." : "Search"}
      </button>

      {error && <div className="alert error">{error}</div>}

      {asset && (
        <div className="asset-card" style={{ marginTop: "1.5rem" }}>
          <div className="asset-header">
            <div>
              <div className="asset-id">{asset.assetId}</div>
              <div className="asset-type">{asset.assetType}</div>
            </div>
            <span className={`badge ${asset.isVerified ? "verified" : "unverified"}`}>
              {asset.isVerified ? "✅ Verified" : "⏳ Unverified"}
            </span>
          </div>

          <div className="asset-field">Token ID: <span>#{asset.tokenId.toString()}</span></div>
          <div className="asset-field">
            Current Owner: <span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{owner}</span>
          </div>
          <div className="asset-field">
            Issuer: <span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{asset.issuer}</span>
          </div>
          <div className="asset-field">Registered: <span>{fmt(asset.registeredAt)}</span></div>
          {asset.isVerified && (
            <div className="asset-field">Verified At: <span>{fmt(asset.verifiedAt)}</span></div>
          )}
          <div className="asset-field">
            IPFS Metadata:{" "}
            <a
              href={ipfsUrl(asset.ipfsCID)}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#6c63ff" }}
            >
              {asset.ipfsCID.slice(0, 20)}…
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

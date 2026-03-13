// frontend/src/components/RegisterAsset.js
import React, { useState } from "react";
import { uploadFileToIPFS, uploadMetadataToIPFS } from "../utils/ipfs";

const ASSET_TYPES = ["RealEstate", "Gold", "Artwork", "Vehicle", "Certificate", "Shares", "LandRecord", "Other"];

export default function RegisterAsset({ contract, address }) {
  const [form, setForm] = useState({
    assetId:    "",
    assetType:  "RealEstate",
    ownerAddr:  address || "",
    description: "",
    location:   "",
    value:      "",
  });
  const [file,    setFile]    = useState(null);
  const [status,  setStatus]  = useState("");
  const [txHash,  setTxHash]  = useState("");
  const [tokenId, setTokenId] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.assetId || !form.ownerAddr) return;
    setLoading(true);
    setStatus("Uploading document to IPFS...");
    setTxHash("");
    setTokenId(null);

    try {
      // 1. Upload document file (optional)
      let documentCID = "";
      if (file) {
        documentCID = await uploadFileToIPFS(file);
      }

      // 2. Upload metadata JSON to IPFS
      setStatus("Uploading metadata to IPFS...");
      const metadata = {
        assetId:     form.assetId,
        assetType:   form.assetType,
        description: form.description,
        location:    form.location,
        estimatedValue: form.value,
        documentCID,
        registeredBy: address,
        registeredAt: new Date().toISOString(),
      };
      const metaCID = await uploadMetadataToIPFS(metadata);

      // 3. Register on blockchain
      setStatus("Sending transaction to blockchain...");
      const tx = await contract.registerAsset(
        form.ownerAddr,
        form.assetId,
        form.assetType,
        metaCID
      );

      setTxHash(tx.hash);
      setStatus("Waiting for confirmation...");
      const receipt = await tx.wait();

      // Extract tokenId from event
      const event = receipt.logs.find((l) => {
        try { return contract.interface.parseLog(l)?.name === "AssetRegistered"; }
        catch { return false; }
      });
      if (event) {
        const parsed = contract.interface.parseLog(event);
        setTokenId(parsed.args.tokenId.toString());
      }

      setStatus("✅ Asset registered successfully!");
    } catch (e) {
      setStatus("❌ Error: " + (e.reason || e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>📋 Register New Asset</h2>

      <div className="form-group">
        <label>Asset ID (unique, e.g. PROP-001)</label>
        <input value={form.assetId} onChange={(e) => set("assetId", e.target.value)} placeholder="PROP-001" />
      </div>

      <div className="form-group">
        <label>Asset Type</label>
        <select value={form.assetType} onChange={(e) => set("assetType", e.target.value)}>
          {ASSET_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label>Owner Wallet Address</label>
        <input value={form.ownerAddr} onChange={(e) => set("ownerAddr", e.target.value)} placeholder="0x..." />
      </div>

      <div className="form-group">
        <label>Description</label>
        <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="3BHK flat, 1200 sq ft, Mumbai..." />
      </div>

      <div className="form-group">
        <label>Location / Identifier</label>
        <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Survey No. 123, Block A" />
      </div>

      <div className="form-group">
        <label>Estimated Value (optional)</label>
        <input value={form.value} onChange={(e) => set("value", e.target.value)} placeholder="50,00,000 INR" />
      </div>

      <div className="form-group">
        <label>Supporting Document (PDF/Image) — uploaded to IPFS</label>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" />
      </div>

      <button className="primary" onClick={handleSubmit} disabled={loading || !form.assetId}>
        {loading ? "Processing..." : "Register Asset"}
      </button>

      {status && (
        <div className={`alert ${status.startsWith("✅") ? "success" : status.startsWith("❌") ? "error" : "info"}`}>
          {status}
          {tokenId && <div style={{ marginTop: 6 }}>Token ID: <strong>#{tokenId}</strong></div>}
          {txHash  && (
            <div style={{ marginTop: 4, fontSize: "0.8rem", wordBreak: "break-all" }}>
              Tx: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: "#a78bfa" }}>{txHash}</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

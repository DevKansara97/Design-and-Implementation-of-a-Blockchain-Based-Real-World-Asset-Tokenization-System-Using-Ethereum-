// frontend/src/components/RegisterAsset.js
import React, { useState } from "react";

const ASSET_TYPES = [
  "RealEstate", "Gold", "Artwork", "Vehicle",
  "Certificate", "Shares", "LandRecord", "Other"
];

const PINATA_KEY    = process.env.REACT_APP_PINATA_API_KEY;
const PINATA_SECRET = process.env.REACT_APP_PINATA_SECRET;
const HAS_PINATA    = PINATA_KEY && PINATA_KEY.trim() !== "" && PINATA_KEY !== "your_pinata_api_key";

export default function RegisterAsset({ contract, address }) {
  const [form, setForm] = useState({
    assetId:     "",
    assetType:   "RealEstate",
    ownerAddr:   address || "",
    description: "",
    location:    "",
    value:       "",
  });

  const [file,        setFile]        = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [status,      setStatus]      = useState("");
  const [statusType,  setStatusType]  = useState("info");
  const [txHash,      setTxHash]      = useState("");
  const [tokenId,     setTokenId]     = useState(null);
  const [docCID,      setDocCID]      = useState("");
  const [loading,     setLoading]     = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [dragOver,    setDragOver]    = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setMsg = (msg, type = "info") => { setStatus(msg); setStatusType(type); };

  // ── File selection ──────────────────────────────────────────────────────────
  const handleFile = (f) => {
    if (!f) return;
    const maxMB = 10;
    if (f.size > maxMB * 1024 * 1024) {
      setMsg(`❌ File too large. Max size is ${maxMB}MB.`, "error"); return;
    }
    setFile(f);
    setDocCID("");
    setMsg("");
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target.result);
      reader.readAsDataURL(f);
    } else {
      setFilePreview(null);
    }
  };

  // ── Upload file to Pinata ───────────────────────────────────────────────────
  const uploadFile = async (f) => {
    const fd = new FormData();
    fd.append("file", f);
    fd.append("pinataMetadata", JSON.stringify({ name: f.name }));
    fd.append("pinataOptions",  JSON.stringify({ cidVersion: 1 }));

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method:  "POST",
      headers: {
        pinata_api_key:        PINATA_KEY,
        pinata_secret_api_key: PINATA_SECRET,
      },
      body: fd,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.details || err.error || "Pinata file upload failed — check your API keys");
    }
    const data = await res.json();
    return data.IpfsHash;
  };

  // ── Upload JSON metadata to Pinata ─────────────────────────────────────────
  const uploadMetadata = async (metadata) => {
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method:  "POST",
      headers: {
        "Content-Type":        "application/json",
        pinata_api_key:        PINATA_KEY,
        pinata_secret_api_key: PINATA_SECRET,
      },
      body: JSON.stringify({
        pinataContent:  metadata,
        pinataMetadata: { name: "RWA-" + metadata.assetId },
        pinataOptions:  { cidVersion: 1 },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.details || "Pinata metadata upload failed");
    }
    const data = await res.json();
    return data.IpfsHash;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.assetId.trim())   { setMsg("❌ Asset ID is required.", "error"); return; }
    if (!form.ownerAddr.trim()) { setMsg("❌ Owner Address is required.", "error"); return; }
    if (!file)                  { setMsg("❌ Please upload a supporting document. The verifier needs it to approve the asset.", "error"); return; }
    if (!HAS_PINATA)            { setMsg("❌ Pinata API keys are not set. See setup instructions below.", "error"); return; }

    setLoading(true);
    setStatus(""); setTxHash(""); setTokenId(null); setDocCID("");
    setProgress(0);

    try {
      // Step 1 — Upload document
      setMsg("📤  Step 1 / 3  —  Uploading document to IPFS via Pinata...");
      setProgress(15);
      const documentCID = await uploadFile(file);
      setDocCID(documentCID);
      setProgress(40);

      // Step 2 — Upload metadata
      setMsg("📤  Step 2 / 3  —  Uploading metadata to IPFS...");
      setProgress(50);
      const metadata = {
        assetId:        form.assetId,
        assetType:      form.assetType,
        description:    form.description,
        location:       form.location,
        estimatedValue: form.value,
        documentCID,
        documentName:   file.name,
        documentType:   file.type,
        documentSize:   (file.size / 1024).toFixed(1) + " KB",
        viewDocument:   "https://ipfs.io/ipfs/" + documentCID,
        registeredBy:   address,
        registeredAt:   new Date().toISOString(),
      };
      const metaCID = await uploadMetadata(metadata);
      setProgress(70);

      // Step 3 — Blockchain transaction
      setMsg("⛓️  Step 3 / 3  —  Registering on Ethereum blockchain...");
      setProgress(80);
      const tx = await contract.registerAsset(form.ownerAddr, form.assetId, form.assetType, metaCID);
      setTxHash(tx.hash);
      setMsg("⏳  Waiting for block confirmation...");
      setProgress(90);
      const receipt = await tx.wait();
      setProgress(100);

      // Extract tokenId from event
      let mintedId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === "AssetRegistered") {
            mintedId = parsed.args.tokenId.toString(); break;
          }
        } catch (_) {}
      }
      setTokenId(mintedId);
      setMsg("✅ Asset registered successfully!", "success");

      // Reset
      setForm({ assetId: "", assetType: "RealEstate", ownerAddr: address || "", description: "", location: "", value: "" });
      setFile(null); setFilePreview(null);

    } catch (e) {
      setMsg("❌ " + (e?.reason || e?.message || "Unknown error"), "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Icon for file type ──────────────────────────────────────────────────────
  const fileIcon = (f) => {
    if (!f) return "📂";
    if (f.type === "application/pdf")    return "📄";
    if (f.type.startsWith("image/"))     return "🖼️";
    return "📎";
  };

  return (
    <div className="card">
      <h2>📋 Register New Asset</h2>

      {/* Pinata setup warning */}
      {!HAS_PINATA && (
        <div className="alert error" style={{ marginBottom: "1.5rem" }}>
          <strong>⚠️ Pinata API keys required for document upload</strong>
          <ol style={{ marginTop: "10px", paddingLeft: "20px", lineHeight: "1.9" }}>
            <li>Go to <a href="https://pinata.cloud" target="_blank" rel="noreferrer" style={{ color: "#a78bfa" }}>pinata.cloud</a> → Sign up free (1 GB free)</li>
            <li>Click <strong>API Keys</strong> in the left sidebar → <strong>New Key</strong></li>
            <li>Enable <strong>pinFileToIPFS</strong> and <strong>pinJSONToIPFS</strong> → Create</li>
            <li>Copy the <strong>API Key</strong> and <strong>API Secret</strong></li>
            <li>Open <code>frontend/.env</code> and fill in:<br />
              <code style={{ display:"block", marginTop:"4px", background:"rgba(0,0,0,0.3)", padding:"6px 10px", borderRadius:"6px", fontSize:"0.82rem" }}>
                REACT_APP_PINATA_API_KEY=your_api_key_here<br />
                REACT_APP_PINATA_SECRET=your_secret_here
              </code>
            </li>
            <li>Stop Terminal 3 → <code>npm start</code> again</li>
          </ol>
        </div>
      )}

      {HAS_PINATA && (
        <div className="alert success" style={{ marginBottom: "1.2rem", padding: "10px 14px" }}>
          ✅ Pinata connected — documents will be stored on IPFS
        </div>
      )}

      {/* Form fields */}
      <div className="form-group">
        <label>Asset ID <span style={{ color:"#ef4444" }}>*</span></label>
        <input value={form.assetId} onChange={(e) => set("assetId", e.target.value)} placeholder="PROP-001" disabled={loading} />
      </div>

      <div className="form-group">
        <label>Asset Type <span style={{ color:"#ef4444" }}>*</span></label>
        <select value={form.assetType} onChange={(e) => set("assetType", e.target.value)} disabled={loading}>
          {ASSET_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label>Owner Wallet Address <span style={{ color:"#ef4444" }}>*</span></label>
        <input value={form.ownerAddr} onChange={(e) => set("ownerAddr", e.target.value)} placeholder="0x..." disabled={loading} />
      </div>

      <div className="form-group">
        <label>Description</label>
        <input value={form.description} onChange={(e) => set("description", e.target.value)}
          placeholder="3BHK flat, 1200 sq ft, Mumbai" disabled={loading} />
      </div>

      <div className="form-group">
        <label>Location / Survey Number</label>
        <input value={form.location} onChange={(e) => set("location", e.target.value)}
          placeholder="Survey No. 123, Block A, Andheri" disabled={loading} />
      </div>

      <div className="form-group">
        <label>Estimated Value</label>
        <input value={form.value} onChange={(e) => set("value", e.target.value)}
          placeholder="50,00,000 INR" disabled={loading} />
      </div>

      {/* ── Document upload ── */}
      <div className="form-group">
        <label>
          Supporting Document <span style={{ color:"#ef4444" }}>*</span>
          <span style={{ color:"var(--muted)", fontWeight:"normal", marginLeft:"8px", fontSize:"0.8rem" }}>
            Property deed, invoice, certificate, photo — uploaded to IPFS for verifier
          </span>
        </label>

        <div
          onClick={() => !loading && document.getElementById("docInput").click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          style={{
            border:       `2px dashed ${dragOver ? "#6c63ff" : file ? "#00c9a7" : "var(--border)"}`,
            borderRadius: "12px",
            padding:      "28px 20px",
            textAlign:    "center",
            cursor:       loading ? "not-allowed" : "pointer",
            background:   dragOver ? "rgba(108,99,255,0.06)" : file ? "rgba(0,201,167,0.05)" : "transparent",
            transition:   "all 0.2s",
          }}
        >
          <div style={{ fontSize: "2.4rem", marginBottom: "8px" }}>{fileIcon(file)}</div>
          {file ? (
            <>
              <div style={{ color: "#00c9a7", fontWeight: "600" }}>{file.name}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "4px" }}>
                {(file.size / 1024).toFixed(1)} KB &nbsp;·&nbsp; {file.type || "unknown"}
              </div>
              <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "8px" }}>
                Click or drag to replace
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: "500", marginBottom: "4px" }}>Click to upload or drag &amp; drop</div>
              <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                PDF, JPG, PNG &nbsp;·&nbsp; Max 10 MB
              </div>
            </>
          )}
        </div>

        <input id="docInput" type="file" style={{ display:"none" }}
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
          onChange={(e) => handleFile(e.target.files[0])} />

        {/* Image preview */}
        {filePreview && (
          <div style={{ marginTop: "10px", textAlign: "center" }}>
            <img src={filePreview} alt="preview"
              style={{ maxHeight: "180px", maxWidth: "100%", borderRadius: "8px", border: "1px solid var(--border)" }} />
          </div>
        )}
      </div>

      {/* Progress bar */}
      {loading && (
        <div style={{ marginBottom: "14px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.8rem", color:"var(--muted)", marginBottom:"5px" }}>
            <span>Upload &amp; registration progress</span><span>{progress}%</span>
          </div>
          <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:"8px", height:"8px", overflow:"hidden" }}>
            <div style={{
              width: progress + "%", height: "100%",
              background: "linear-gradient(90deg, #6c63ff, #00c9a7)",
              borderRadius: "8px", transition: "width 0.5s ease",
            }} />
          </div>
        </div>
      )}

      <button className="primary" onClick={handleSubmit}
        disabled={loading || !form.assetId || !HAS_PINATA}>
        {loading ? "Processing..." : "📤  Register Asset on Blockchain"}
      </button>

      {/* Status message */}
      {status && (
        <div className={`alert ${statusType}`} style={{ marginTop:"1rem" }}>
          <div>{status}</div>

          {/* Success details */}
          {statusType === "success" && tokenId && (
            <div style={{
              marginTop: "12px", padding: "12px",
              background: "rgba(0,0,0,0.25)", borderRadius: "10px",
              fontSize: "0.88rem", lineHeight: "1.8"
            }}>
              <div>🏷️ Token ID: <strong>#{tokenId}</strong></div>

              {docCID && (
                <div>
                  📎 Document on IPFS:{" "}
                  <a href={`https://ipfs.io/ipfs/${docCID}`} target="_blank" rel="noreferrer"
                    style={{ color: "#a78bfa", wordBreak: "break-all" }}>
                    ipfs.io/ipfs/{docCID.slice(0, 24)}...
                  </a>
                  <span style={{ color:"var(--muted)", marginLeft:"6px", fontSize:"0.78rem" }}>
                    (verifier can open this link to inspect the document)
                  </span>
                </div>
              )}

              {txHash && (
                <div style={{ marginTop: "4px", fontSize: "0.78rem", color: "var(--muted)", wordBreak: "break-all" }}>
                  Tx: {txHash}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
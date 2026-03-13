// frontend/src/components/GrantRole.js
import React, { useState } from "react";
import { ROLES } from "../utils/contract";

const ROLE_OPTIONS = [
  { label: "Issuer",   value: ROLES.ISSUER_ROLE },
  { label: "Verifier", value: ROLES.VERIFIER_ROLE },
  { label: "Admin",    value: ROLES.ADMIN_ROLE },
];

export default function GrantRole({ contract }) {
  const [address, setAddress] = useState("");
  const [role,    setRole]    = useState(ROLES.ISSUER_ROLE);
  const [status,  setStatus]  = useState("");
  const [loading, setLoading] = useState(false);

  const handleGrant = async () => {
    if (!address || !role) return;
    setLoading(true);
    setStatus("Sending transaction...");
    try {
      const tx = await contract.grantRole(role, address);
      setStatus("Waiting for confirmation...");
      await tx.wait();
      setStatus("✅ Role granted successfully!");
    } catch (e) {
      setStatus("❌ " + (e.reason || e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>⚙️ Manage Roles</h2>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        As Admin, you can grant Issuer or Verifier roles to other wallet addresses.
      </p>

      <div className="form-group">
        <label>Wallet Address</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x..." />
      </div>

      <div className="form-group">
        <label>Role to Grant</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <button className="primary" onClick={handleGrant} disabled={loading || !address}>
        {loading ? "Granting..." : "Grant Role"}
      </button>

      {status && (
        <div className={`alert ${status.startsWith("✅") ? "success" : status.startsWith("❌") ? "error" : "info"}`}>
          {status}
        </div>
      )}

      <div style={{ marginTop: "2rem", padding: "1rem", background: "var(--card)", borderRadius: "10px" }}>
        <h3 style={{ fontSize: "0.9rem", marginBottom: "0.8rem", color: "var(--muted)" }}>Role Reference</h3>
        <div className="asset-field"><span className="tag admin">Admin</span> — Full control, can grant roles</div>
        <div className="asset-field" style={{ marginTop: "8px" }}><span className="tag issuer">Issuer</span> — Can register new assets</div>
        <div className="asset-field" style={{ marginTop: "8px" }}><span className="tag verifier">Verifier</span> — Can verify assets (enables transfer)</div>
      </div>
    </div>
  );
}

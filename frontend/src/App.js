// frontend/src/App.js
import React, { useState, useCallback } from "react";
import { connectWallet } from "./utils/wallet";
import RegisterAsset from "./components/RegisterAsset";
import VerifyAsset from "./components/VerifyAsset";
import TransferAsset from "./components/TransferAsset";
import ViewAsset from "./components/ViewAsset";
import GrantRole from "./components/GrantRole";
import "./App.css";

export default function App() {
  const [wallet, setWallet]   = useState(null);
  const [tab, setTab]         = useState("view");
  const [error, setError]     = useState("");

  const handleConnect = useCallback(async () => {
    try {
      setError("");
      const w = await connectWallet();
      setWallet(w);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const short = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  const tabs = [
    { id: "view",     label: "🔍 View Asset",     show: true },
    { id: "register", label: "📋 Register",        show: wallet?.roles?.isIssuer },
    { id: "verify",   label: "✅ Verify",           show: wallet?.roles?.isVerifier },
    { id: "transfer", label: "🔁 Transfer",         show: !!wallet },
    { id: "roles",    label: "⚙️ Manage Roles",    show: wallet?.roles?.isAdmin },
  ];

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div>
            <h1>RWA Tokenization</h1>
            <p>Real-World Asset Tokenization on Ethereum · IBC02</p>
          </div>
          {wallet ? (
            <div className="wallet-badge">
              <span className="dot green" />
              {short(wallet.address)}
              <span className="role-tags">
                {wallet.roles.isAdmin    && <span className="tag admin">Admin</span>}
                {wallet.roles.isIssuer   && <span className="tag issuer">Issuer</span>}
                {wallet.roles.isVerifier && <span className="tag verifier">Verifier</span>}
              </span>
            </div>
          ) : (
            <button className="btn-connect" onClick={handleConnect}>
              Connect MetaMask
            </button>
          )}
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {!wallet && (
        <div className="welcome">
          <div className="welcome-card">
            <h2>Welcome to RWA Tokenization</h2>
            <p>
              A blockchain-based system to register, verify and transfer ownership of
              real-world assets (real estate, gold, artwork, certificates) using Ethereum NFTs.
            </p>
            <button className="btn-connect large" onClick={handleConnect}>
              🦊 Connect MetaMask to Get Started
            </button>
          </div>
        </div>
      )}

      {wallet && (
        <>
          <nav className="tabs">
            {tabs.filter((t) => t.show).map((t) => (
              <button
                key={t.id}
                className={`tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <main className="content">
            {tab === "view"     && <ViewAsset     contract={wallet.contract} />}
            {tab === "register" && <RegisterAsset contract={wallet.contract} address={wallet.address} />}
            {tab === "verify"   && <VerifyAsset   contract={wallet.contract} />}
            {tab === "transfer" && <TransferAsset contract={wallet.contract} />}
            {tab === "roles"    && <GrantRole      contract={wallet.contract} />}
          </main>
        </>
      )}
    </div>
  );
}

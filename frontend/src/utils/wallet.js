// frontend/src/utils/wallet.js
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, ROLES } from "./contract";

let provider = null;
let signer   = null;
let contract = null;

const HARDHAT_CHAIN_ID = "0x7A69"; // 31337 in hex

async function switchToHardhat() {
  try {
    // Try switching to Hardhat Local
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HARDHAT_CHAIN_ID }],
    });
  } catch (switchError) {
    // Error code 4902 means the network hasn't been added yet — add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId:         HARDHAT_CHAIN_ID,
          chainName:       "Hardhat Local",
          nativeCurrency:  { name: "Ethereum", symbol: "ETH", decimals: 18 },
          rpcUrls:         ["http://127.0.0.1:8545"],
        }],
      });
    } else {
      throw switchError;
    }
  }
}

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install MetaMask.");
  }

  // Request accounts first
  await window.ethereum.request({ method: "eth_requestAccounts" });

  // Auto-switch to Hardhat Local — no manual switching needed
  await switchToHardhat();

  // Small delay to let MetaMask finish switching
  await new Promise((r) => setTimeout(r, 500));

  provider = new ethers.BrowserProvider(window.ethereum);
  signer   = await provider.getSigner();

  // Double-check chain ID
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  if (chainId !== 31337) {
    throw new Error(
      `Still on wrong network (Chain ID: ${chainId}). ` +
      `Please manually select "Hardhat Local" in MetaMask and try again.`
    );
  }

  // Check contract address is configured
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x...") {
    throw new Error(
      "Contract address missing. Add REACT_APP_CONTRACT_ADDRESS to frontend/.env and restart npm start."
    );
  }

  // Check contract exists on chain
  const code = await provider.getCode(CONTRACT_ADDRESS);
  if (code === "0x") {
    throw new Error(
      "No contract found at " + CONTRACT_ADDRESS + ". " +
      "Run: npx hardhat run scripts/deploy.js --network localhost  " +
      "then update frontend/.env and restart npm start."
    );
  }

  contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  const address = await signer.getAddress();

  // Check roles individually
  let isAdmin = false, isIssuer = false, isVerifier = false;
  try { isAdmin    = await contract.hasRole(ROLES.ADMIN_ROLE,    address); } catch (_) {}
  try { isIssuer   = await contract.hasRole(ROLES.ISSUER_ROLE,   address); } catch (_) {}
  try { isVerifier = await contract.hasRole(ROLES.VERIFIER_ROLE, address); } catch (_) {}

  return { provider, signer, contract, address, roles: { isAdmin, isIssuer, isVerifier } };
}

export const getContract = () => contract;
export const getSigner   = () => signer;
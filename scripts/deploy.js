// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=================================================");
  console.log(" RWA Tokenization System - IBC02");
  console.log("=================================================");
  console.log("Deploying with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await deployer.provider.getBalance(deployer.address)),
    "ETH"
  );
  console.log("");

  // ─── Deploy RWATokenization (NFT contract) ──────────────────────────────
  console.log("Deploying RWATokenization (NFT)...");
  const RWATokenization = await ethers.getContractFactory("RWATokenization");
  const rwa = await RWATokenization.deploy();
  await rwa.waitForDeployment();

  const rwaAddress = await rwa.getAddress();
  console.log("✅ RWATokenization deployed at:", rwaAddress);

  // ─── Deploy a sample FractionalAsset ────────────────────────────────────
  console.log("\nDeploying sample FractionalAsset (ERC-20)...");
  const FractionalAsset = await ethers.getContractFactory("FractionalAsset");
  const fractional = await FractionalAsset.deploy(
    "PROP-SAMPLE-001",       // assetId
    "RealEstate",            // assetType
    "QmSampleCID123",        // ipfsCID (replace with real IPFS CID)
    1000,                    // totalShares
    deployer.address         // owner
  );
  await fractional.waitForDeployment();

  const fracAddress = await fractional.getAddress();
  console.log("✅ FractionalAsset deployed at:", fracAddress);

  // ─── Summary ────────────────────────────────────────────────────────────
  console.log("\n=================================================");
  console.log(" DEPLOYMENT SUMMARY");
  console.log("=================================================");
  console.log("Network:             ", (await ethers.provider.getNetwork()).name);
  console.log("RWATokenization:     ", rwaAddress);
  console.log("FractionalAsset:     ", fracAddress);
  console.log("Deployer (Admin):    ", deployer.address);
  console.log("\n📋 Copy RWATokenization address to frontend/.env:");
  console.log("REACT_APP_CONTRACT_ADDRESS=" + rwaAddress);
  console.log("=================================================\n");

  // ─── Verify on Etherscan (Sepolia only) ─────────────────────────────────
  if (process.env.ETHERSCAN_API_KEY && network.name === "sepolia") {
    console.log("Waiting 30s before verifying on Etherscan...");
    await new Promise((r) => setTimeout(r, 30000));

    await hre.run("verify:verify", { address: rwaAddress, constructorArguments: [] });
    console.log("✅ RWATokenization verified on Etherscan");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

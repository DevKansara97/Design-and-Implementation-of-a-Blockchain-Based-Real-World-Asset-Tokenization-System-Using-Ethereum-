const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWATokenization", function () {
  let rwa;
  let admin, issuer, verifier, owner, buyer;

  const ISSUER_ROLE   = ethers.keccak256(ethers.toUtf8Bytes("ISSUER_ROLE"));
  const VERIFIER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VERIFIER_ROLE"));

  beforeEach(async () => {
    [admin, issuer, verifier, owner, buyer] = await ethers.getSigners();

    const RWATokenization = await ethers.getContractFactory("RWATokenization");
    rwa = await RWATokenization.deploy();

    // Grant roles
    await rwa.connect(admin).grantRole(ISSUER_ROLE, issuer.address);
    await rwa.connect(admin).grantRole(VERIFIER_ROLE, verifier.address);
  });

  // ─── Registration ─────────────────────────────────────────────────────────
  describe("Asset Registration", () => {
    it("should allow an issuer to register an asset", async () => {
      const tx = await rwa
        .connect(issuer)
        .registerAsset(owner.address, "PROP-001", "RealEstate", "QmABC123");

      await expect(tx)
        .to.emit(rwa, "AssetRegistered")
        .withArgs(1, "PROP-001", owner.address, "RealEstate", "QmABC123", await getTimestamp(tx));

      expect(await rwa.totalAssets()).to.equal(1);
      expect(await rwa.ownerOf(1)).to.equal(owner.address);
    });

    it("should reject duplicate asset IDs", async () => {
      await rwa.connect(issuer).registerAsset(owner.address, "PROP-001", "RealEstate", "QmABC123");
      await expect(
        rwa.connect(issuer).registerAsset(owner.address, "PROP-001", "RealEstate", "QmXYZ")
      ).to.be.revertedWith("Asset ID already registered");
    });

    it("should reject non-issuers from registering", async () => {
      await expect(
        rwa.connect(buyer).registerAsset(owner.address, "PROP-001", "RealEstate", "QmABC")
      ).to.be.reverted;
    });
  });

  // ─── Verification ─────────────────────────────────────────────────────────
  describe("Asset Verification", () => {
    beforeEach(async () => {
      await rwa.connect(issuer).registerAsset(owner.address, "PROP-001", "RealEstate", "QmABC123");
    });

    it("should allow verifier to verify an asset", async () => {
      const tx = await rwa.connect(verifier).verifyAsset(1);
      await expect(tx).to.emit(rwa, "AssetVerified");
      expect(await rwa.isAssetVerified(1)).to.be.true;
    });

    it("should reject double verification", async () => {
      await rwa.connect(verifier).verifyAsset(1);
      await expect(rwa.connect(verifier).verifyAsset(1)).to.be.revertedWith(
        "Asset already verified"
      );
    });

    it("should reject non-verifiers from verifying", async () => {
      await expect(rwa.connect(buyer).verifyAsset(1)).to.be.reverted;
    });
  });

  // ─── Transfer ─────────────────────────────────────────────────────────────
  describe("Asset Transfer", () => {
    beforeEach(async () => {
      await rwa.connect(issuer).registerAsset(owner.address, "PROP-001", "RealEstate", "QmABC123");
    });

    it("should prevent transfer of unverified asset", async () => {
      await expect(
        rwa.connect(owner).transferAsset(buyer.address, 1)
      ).to.be.revertedWith("Asset must be verified before transfer");
    });

    it("should allow transfer of verified asset", async () => {
      await rwa.connect(verifier).verifyAsset(1);
      const tx = await rwa.connect(owner).transferAsset(buyer.address, 1);
      await expect(tx).to.emit(rwa, "AssetTransferred");
      expect(await rwa.ownerOf(1)).to.equal(buyer.address);
    });

    it("should prevent non-owners from transferring", async () => {
      await rwa.connect(verifier).verifyAsset(1);
      await expect(rwa.connect(buyer).transferAsset(buyer.address, 1)).to.be.revertedWith(
        "Not the asset owner"
      );
    });
  });

  // ─── View Functions ───────────────────────────────────────────────────────
  describe("View Functions", () => {
    it("should look up token ID by asset ID", async () => {
      await rwa.connect(issuer).registerAsset(owner.address, "PROP-001", "RealEstate", "QmABC123");
      expect(await rwa.getTokenIdByAssetId("PROP-001")).to.equal(1);
    });

    it("should return full asset details", async () => {
      await rwa.connect(issuer).registerAsset(owner.address, "PROP-001", "RealEstate", "QmABC123");
      const asset = await rwa.getAsset(1);
      expect(asset.assetId).to.equal("PROP-001");
      expect(asset.assetType).to.equal("RealEstate");
      expect(asset.isVerified).to.be.false;
    });
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getTimestamp(tx) {
  const receipt = await tx.wait();
  const block = await ethers.provider.getBlock(receipt.blockNumber);
  return block.timestamp;
}

// ─── FractionalAsset ──────────────────────────────────────────────────────────
describe("FractionalAsset", () => {
  let frac;
  let owner, buyer;

  beforeEach(async () => {
    [owner, buyer] = await ethers.getSigners();
    const FractionalAsset = await ethers.getContractFactory("FractionalAsset");
    frac = await FractionalAsset.deploy("GOLD-001", "Gold", "QmGoldCID", 1000, owner.address);
  });

  it("should mint all shares to owner", async () => {
    expect(await frac.balanceOf(owner.address)).to.equal(1000);
  });

  it("should transfer shares", async () => {
    await frac.connect(owner).transferShares(buyer.address, 300);
    expect(await frac.balanceOf(buyer.address)).to.equal(300);
  });

  it("should calculate ownership percentage (basis points)", async () => {
    await frac.connect(owner).transferShares(buyer.address, 250);
    // buyer owns 250/1000 = 25% = 2500 basis points
    expect(await frac.ownershipPercentage(buyer.address)).to.equal(2500);
  });

  it("should verify the asset", async () => {
    await frac.connect(owner).verify();
    expect(await frac.isVerified()).to.be.true;
  });
});

import { ethers, network, run } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with ${deployer.address} on ${network.name}...`);
  const registry = await ethers.deployContract("SkillStampRegistry", [deployer.address]);
  const tx = registry.deploymentTransaction();
  await registry.waitForDeployment();
  const receipt = await tx!.wait(network.name === "sepolia" ? 5 : 1);
  const address = await registry.getAddress();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  const info = {
    address,
    chainId,
    network: network.name,
    deployer: deployer.address,
    txHash: tx!.hash,
    deployBlock: receipt!.blockNumber,
    deployedAt: new Date().toISOString(),
  };
  console.log("Deployed:", info);

  if (chainId === 11155111) {
    const out = path.join(__dirname, "..", "src", "config", "deployment.json");
    fs.writeFileSync(out, JSON.stringify(info, null, 2) + "\n");
    console.log(`Saved ${out}`);
    if (process.env.ETHERSCAN_API_KEY) {
      try {
        await run("verify:verify", { address, constructorArguments: [deployer.address] });
        console.log("Etherscan verification succeeded.");
      } catch (e) {
        console.log("Etherscan verification failed (you can retry manually):", (e as Error).message);
      }
    }
  } else {
    console.log("Not Sepolia: src/config/deployment.json was NOT updated.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

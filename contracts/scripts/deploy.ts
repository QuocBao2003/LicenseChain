import { ethers } from 'hardhat';

async function main() {
  const registry = await ethers.deployContract('LicenseRegistry');
  await registry.waitForDeployment();
  console.log('LicenseRegistry deployed to:', await registry.getAddress());
}
main().catch((e) => { console.error(e); process.exit(1); });

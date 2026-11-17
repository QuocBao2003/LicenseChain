import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('LicenseRegistry', () => {
  it('deploys', async () => {
    const registry = await ethers.deployContract('LicenseRegistry');
    expect(await registry.VERSION()).to.equal('0.0.1');
  });
});

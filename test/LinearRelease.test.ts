// SPDX-License-Identifier: BUSL-1.1
/*
 _______   __         ______   __      __        ________  __                                                   
/       \ /  |       /      \ /  \    /  |      /        |/  |                                                  
$$$$$$$  |$$ |      /$$$$$$  |$$  \  /$$/       $$$$$$$$/ $$/  _______    ______   _______    _______   ______  
$$ |__$$ |$$ |      $$ |__$$ | $$  \/$$/        $$ |__    /  |/       \  /      \ /       \  /       | /      \ 
$$    $$/ $$ |      $$    $$ |  $$  $$/         $$    |   $$ |$$$$$$$  | $$$$$$  |$$$$$$$  |/$$$$$$$/ /$$$$$$  |
$$$$$$$/  $$ |      $$$$$$$$ |   $$$$/          $$$$$/    $$ |$$ |  $$ | /    $$ |$$ |  $$ |$$ |      $$    $$ |
$$ |      $$ |_____ $$ |  $$ |    $$ |          $$ |      $$ |$$ |  $$ |/$$$$$$$ |$$ |  $$ |$$ \_____ $$$$$$$$/ 
$$ |      $$       |$$ |  $$ |    $$ |          $$ |      $$ |$$ |  $$ |$$    $$ |$$ |  $$ |$$       |$$       |
$$/       $$$$$$$$/ $$/   $$/     $$/           $$/       $$/ $$/   $$/  $$$$$$$/ $$/   $$/  $$$$$$$/  $$$$$$$/ 
                                                                                                                
*/
import { ethers } from "hardhat";
import { Signer } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import "@openzeppelin/test-helpers";
import {
  MockERC20,
  MockERC20__factory,
  LinearRelease,
  LinearRelease__factory
} from "../typechain";
import { latestBlockNumber, advanceBlockTo } from "./helpers/time"

chai.use(solidity);
const { expect } = chai;

describe("LinearRelease", function() {
  this.timeout(0);
  const ADDRESS0 = '0x0000000000000000000000000000000000000000'

  // Accounts
  let deployer: Signer;
  let alice: Signer;

  let mockERC20: MockERC20;
  let mockERC20AsDeployer: MockERC20;
  
  let linearRelease: LinearRelease;
  let linearReleaseAsDeployer: LinearRelease;
  let linearReleaseAsAlice: LinearRelease;

  beforeEach(async() => {
    [deployer, alice] = await ethers.getSigners();
        

    const MockERC20 = (await ethers.getContractFactory(
      "MockERC20",
      deployer
    )) as MockERC20__factory;

    mockERC20 = await MockERC20.deploy(`TOKEN`, `TOKEN`);
    await mockERC20.deployed();

    await mockERC20.mint(await deployer.getAddress(), ethers.utils.parseEther('10000'));

    // Deploy LinearRelease
    const LinearRelease = (await ethers.getContractFactory(
      "LinearRelease",
      deployer
    )) as LinearRelease__factory;
    linearRelease = await LinearRelease.deploy(mockERC20.address);
    await linearRelease.deployed();

    mockERC20AsDeployer = MockERC20__factory.connect(mockERC20.address, deployer);
    linearReleaseAsDeployer = LinearRelease__factory.connect(linearRelease.address, deployer);
    linearReleaseAsAlice = LinearRelease__factory.connect(linearRelease.address, alice);
  });
  
  context('when adjust params', async() => {
    it('constructor', async() => {
      const LinearRelease = (await ethers.getContractFactory(
        "LinearRelease",
        deployer
      )) as LinearRelease__factory;
  
      await expect(LinearRelease.deploy(ADDRESS0)).to.be.revertedWith('wrong address');
    });
    
    it('should reverted', async() => {
      await expect(linearReleaseAsDeployer.lock(ADDRESS0, ethers.utils.parseEther('1'), 1)).to.be.revertedWith('lock: no address(0)');
      await expect(linearReleaseAsDeployer.lock(await alice.getAddress(), ethers.utils.parseEther('0'), 1)).to.be.revertedWith('lock: no amount(0)');
    });
  });

  context('permissions', async() => {
    it('should reverted', async() => {
      await expect(linearReleaseAsAlice.lock(await alice.getAddress(), ethers.utils.parseEther('1'), 1)).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  context('should work', async() => {
    it('case 1', async() => {
      expect(await linearRelease.pending(await alice.getAddress())).to.be.eq(0);
      expect(await linearRelease.pending(await deployer.getAddress())).to.be.eq(0);

      expect(await linearRelease.lockOf(await alice.getAddress())).to.be.eq(0);
      expect(await linearRelease.lockOf(await deployer.getAddress())).to.be.eq(0);

      await expect(linearReleaseAsAlice.claim()).to.be.revertedWith('lieanr release: no locked');
      await expect(linearReleaseAsDeployer.claim()).to.be.revertedWith('lieanr release: no locked');
      
      await expect(linearReleaseAsDeployer.lock(await deployer.getAddress(), ethers.utils.parseEther('100'), 0)).to.be.reverted;

      await mockERC20AsDeployer.approve(linearRelease.address, ethers.utils.parseEther('100'));
      await linearReleaseAsDeployer.lock(await deployer.getAddress(), ethers.utils.parseEther('100'), 0);

      let pending = await linearRelease.pending(await deployer.getAddress());
      let lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('100'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));
      let before = await mockERC20.balanceOf(await deployer.getAddress());
      await linearReleaseAsDeployer.claim();
      let after = await mockERC20.balanceOf(await deployer.getAddress());
      expect(after).to.be.eq(before.add(pending));
      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('0'));

      await mockERC20AsDeployer.approve(linearRelease.address, ethers.utils.parseEther('100'));
      await linearReleaseAsDeployer.lock(await deployer.getAddress(), ethers.utils.parseEther('100'), 1);

      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));

      await advanceBlockTo((await latestBlockNumber()).toNumber() + 1);

      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('100'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));
      before = await mockERC20.balanceOf(await deployer.getAddress());
      await linearReleaseAsDeployer.claim();
      after = await mockERC20.balanceOf(await deployer.getAddress());
      expect(after).to.be.eq(before.add(pending));
      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('0'));

      await mockERC20AsDeployer.approve(linearRelease.address, ethers.utils.parseEther('100'));
      await linearReleaseAsDeployer.lock(await deployer.getAddress(), ethers.utils.parseEther('100'), 100);

      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));

      await advanceBlockTo((await latestBlockNumber()).toNumber() + 1);

      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('1'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));
      
      await advanceBlockTo((await latestBlockNumber()).toNumber() + 1);

      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('2'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));

      before = await mockERC20.balanceOf(await deployer.getAddress());
      await linearReleaseAsDeployer.claim();
      after = await mockERC20.balanceOf(await deployer.getAddress());
      expect(after).to.be.eq(before.add(pending.add(ethers.utils.parseEther('1'))));
      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('97'));

      await mockERC20AsDeployer.approve(linearRelease.address, ethers.utils.parseEther('1000'));
      await linearReleaseAsDeployer.lock(await deployer.getAddress(), ethers.utils.parseEther('1000'), 100);

      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('2'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('1097'));

      before = await mockERC20.balanceOf(await deployer.getAddress());
      await linearReleaseAsDeployer.claim();
      after = await mockERC20.balanceOf(await deployer.getAddress());
      expect(after).to.be.eq(before.add(pending.add(ethers.utils.parseEther('11'))));
      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('1084'));

      await mockERC20AsDeployer.approve(linearRelease.address, ethers.utils.parseEther('100'));
      await linearReleaseAsDeployer.lock(await alice.getAddress(), ethers.utils.parseEther('100'), 0);
      
      pending = await linearRelease.pending(await alice.getAddress());
      lockOf = await linearRelease.lockOf(await alice.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('100'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));
      before = await mockERC20.balanceOf(await alice.getAddress());
      await linearReleaseAsAlice.claim();
      after = await mockERC20.balanceOf(await alice.getAddress());
      expect(after).to.be.eq(before.add(pending));
      pending = await linearRelease.pending(await alice.getAddress());
      lockOf = await linearRelease.lockOf(await alice.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('0'));
      
      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('33'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('1084'));

      before = await mockERC20.balanceOf(await deployer.getAddress());
      await linearReleaseAsDeployer.claim();
      after = await mockERC20.balanceOf(await deployer.getAddress());
      expect(after).to.be.eq(before.add(pending.add(ethers.utils.parseEther('11'))));
      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('1040'));

      await mockERC20AsDeployer.approve(linearRelease.address, ethers.utils.parseEther('100'));
      await linearReleaseAsDeployer.lock(await alice.getAddress(), ethers.utils.parseEther('100'), 1);
      
      pending = await linearRelease.pending(await alice.getAddress());
      lockOf = await linearRelease.lockOf(await alice.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));
      before = await mockERC20.balanceOf(await alice.getAddress());
      await linearReleaseAsAlice.claim();
      after = await mockERC20.balanceOf(await alice.getAddress());
      expect(after).to.be.eq(before.add(pending.add(ethers.utils.parseEther('100'))));
      pending = await linearRelease.pending(await alice.getAddress());
      lockOf = await linearRelease.lockOf(await alice.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('0'));
      
      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('33'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('1040'));

      before = await mockERC20.balanceOf(await deployer.getAddress());
      await linearReleaseAsDeployer.claim();
      after = await mockERC20.balanceOf(await deployer.getAddress());
      expect(after).to.be.eq(before.add(pending.add(ethers.utils.parseEther('11'))));
      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('996'));

      await mockERC20AsDeployer.approve(linearRelease.address, ethers.utils.parseEther('100'));
      await linearReleaseAsDeployer.lock(await alice.getAddress(), ethers.utils.parseEther('100'), 100);
      
      pending = await linearRelease.pending(await alice.getAddress());
      lockOf = await linearRelease.lockOf(await alice.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));
      before = await mockERC20.balanceOf(await alice.getAddress());
      await linearReleaseAsAlice.claim();
      after = await mockERC20.balanceOf(await alice.getAddress());
      expect(after).to.be.eq(before.add(pending.add(ethers.utils.parseEther('1'))));
      pending = await linearRelease.pending(await alice.getAddress());
      lockOf = await linearRelease.lockOf(await alice.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('99'));
      
      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('33'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('996'));

      before = await mockERC20.balanceOf(await deployer.getAddress());
      await linearReleaseAsDeployer.claim();
      after = await mockERC20.balanceOf(await deployer.getAddress());
      expect(after).to.be.eq(before.add(pending.add(ethers.utils.parseEther('11'))));
      pending = await linearRelease.pending(await deployer.getAddress());
      lockOf = await linearRelease.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('952'));
    });
  })
});
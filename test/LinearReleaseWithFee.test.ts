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
  LinearReleaseWithFee,
  LinearReleaseWithFee__factory
} from "../typechain";
import { latestBlockNumber, advanceBlockTo } from "./helpers/time"

chai.use(solidity);
const { expect } = chai;

describe("LinearReleaseWithFee", function() {
  this.timeout(0);
  const ADDRESS0 = '0x0000000000000000000000000000000000000000'

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let operator: Signer;

  let mockERC20: MockERC20;
  let mockERC20AsDeployer: MockERC20;

  let playToken: MockERC20;
  let playTokenAsDeployer: MockERC20;
  let playTokenAsAlice: MockERC20;
  
  let linearReleaseWithFee: LinearReleaseWithFee;
  let linearReleaseWithFeeAsDeployer: LinearReleaseWithFee;
  let linearReleaseWithFeeAsAlice: LinearReleaseWithFee;

  beforeEach(async() => {
    [deployer, alice, operator] = await ethers.getSigners();
        

    const MockERC20 = (await ethers.getContractFactory(
      "MockERC20",
      deployer
    )) as MockERC20__factory;

    mockERC20 = await MockERC20.deploy(`TOKEN`, `TOKEN`);
    await mockERC20.deployed();
    await mockERC20.mint(await deployer.getAddress(), ethers.utils.parseEther('10000'));

    playToken = await MockERC20.deploy(`PLAYTOKEN`, `PLAYTOKEN`);
    await playToken.deployed();

    // Deploy LinearReleaseWithFee
    const LinearReleaseWithFee = (await ethers.getContractFactory(
      "LinearReleaseWithFee",
      deployer
    )) as LinearReleaseWithFee__factory;
    linearReleaseWithFee = await LinearReleaseWithFee.deploy(mockERC20.address, playToken.address, ethers.utils.parseEther('1'), await operator.getAddress());
    await linearReleaseWithFee.deployed();

    mockERC20AsDeployer = MockERC20__factory.connect(mockERC20.address, deployer);
    linearReleaseWithFeeAsDeployer = LinearReleaseWithFee__factory.connect(linearReleaseWithFee.address, deployer);
    linearReleaseWithFeeAsAlice = LinearReleaseWithFee__factory.connect(linearReleaseWithFee.address, alice);

    playTokenAsDeployer = MockERC20__factory.connect(playToken.address, deployer);
    playTokenAsAlice = MockERC20__factory.connect(playToken.address, alice);
  });
  
  context('when adjust params', async() => {
    it('constructor', async() => {
      const LinearReleaseWithFee = (await ethers.getContractFactory(
        "LinearReleaseWithFee",
        deployer
      )) as LinearReleaseWithFee__factory;
  
      await expect(LinearReleaseWithFee.deploy(ADDRESS0, mockERC20.address, ethers.utils.parseEther('1'), await operator.getAddress())).to.be.revertedWith('wrong address');
      await expect(LinearReleaseWithFee.deploy(mockERC20.address, ADDRESS0, ethers.utils.parseEther('1'), await operator.getAddress())).to.be.revertedWith('wrong address');
      await expect(LinearReleaseWithFee.deploy(mockERC20.address, mockERC20.address, ethers.utils.parseEther('1'), ADDRESS0)).to.be.revertedWith('wrong address');
      await LinearReleaseWithFee.deploy(mockERC20.address, ADDRESS0, ethers.utils.parseEther('0'), await operator.getAddress());
      await LinearReleaseWithFee.deploy(mockERC20.address, mockERC20.address, ethers.utils.parseEther('0'), ADDRESS0);
      await LinearReleaseWithFee.deploy(mockERC20.address, ADDRESS0, ethers.utils.parseEther('0'), ADDRESS0);
    });
    
    it('should reverted', async() => {
      await expect(linearReleaseWithFeeAsDeployer.lock(ADDRESS0, ethers.utils.parseEther('1'), 1)).to.be.revertedWith('lock: no address(0)');
      await expect(linearReleaseWithFeeAsDeployer.lock(await alice.getAddress(), ethers.utils.parseEther('0'), 1)).to.be.revertedWith('lock: no amount(0)');
    });
  });

  context('permissions', async() => {
    it('should reverted', async() => {
      await expect(linearReleaseWithFeeAsAlice.lock(await alice.getAddress(), ethers.utils.parseEther('1'), 1)).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  context('should work', async() => {
    it('case 1', async() => {
      expect(await linearReleaseWithFee.pending(await alice.getAddress())).to.be.eq(0);
      expect(await linearReleaseWithFee.pending(await deployer.getAddress())).to.be.eq(0);

      expect(await linearReleaseWithFee.lockOf(await alice.getAddress())).to.be.eq(0);
      expect(await linearReleaseWithFee.lockOf(await deployer.getAddress())).to.be.eq(0);

      await expect(linearReleaseWithFeeAsAlice.claim()).to.be.revertedWith('revert !safeTransferFrom');
      await expect(linearReleaseWithFeeAsDeployer.claim()).to.be.revertedWith('revert !safeTransferFrom');

      await playTokenAsDeployer.mint(await alice.getAddress(), ethers.utils.parseEther('10000'));
      await playTokenAsDeployer.mint(await deployer.getAddress(), ethers.utils.parseEther('10000'));
      
      await expect(linearReleaseWithFeeAsAlice.claim()).to.be.revertedWith('revert !safeTransferFrom');
      await expect(linearReleaseWithFeeAsDeployer.claim()).to.be.revertedWith('revert !safeTransferFrom');

      await playTokenAsDeployer.approve(linearReleaseWithFee.address, ethers.utils.parseEther('10000'));
      await playTokenAsAlice.approve(linearReleaseWithFee.address, ethers.utils.parseEther('10000'));
      
      await expect(linearReleaseWithFeeAsDeployer.claim()).to.be.revertedWith('lieanr release: no locked');
      await expect(linearReleaseWithFeeAsAlice.claim()).to.be.revertedWith('lieanr release: no locked');
      
      await expect(linearReleaseWithFeeAsDeployer.lock(await deployer.getAddress(), ethers.utils.parseEther('100'), 0)).to.be.reverted;

      await mockERC20AsDeployer.approve(linearReleaseWithFee.address, ethers.utils.parseEther('100'));
      await linearReleaseWithFeeAsDeployer.lock(await deployer.getAddress(), ethers.utils.parseEther('100'), 0);

      let pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      let lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('100'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));
      let before = await mockERC20.balanceOf(await deployer.getAddress());
      await linearReleaseWithFeeAsDeployer.claim();
      let after = await mockERC20.balanceOf(await deployer.getAddress());
      expect(after).to.be.eq(before.add(pending));
      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('0'));

      await mockERC20AsDeployer.approve(linearReleaseWithFee.address, ethers.utils.parseEther('100'));
      await linearReleaseWithFeeAsDeployer.lock(await deployer.getAddress(), ethers.utils.parseEther('100'), 1);

      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));

      await advanceBlockTo((await latestBlockNumber()).toNumber() + 1);

      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('100'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));
      before = await mockERC20.balanceOf(await deployer.getAddress());
      await linearReleaseWithFeeAsDeployer.claim();
      after = await mockERC20.balanceOf(await deployer.getAddress());
      expect(after).to.be.eq(before.add(pending));
      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('0'));

      await mockERC20AsDeployer.approve(linearReleaseWithFee.address, ethers.utils.parseEther('100'));
      await linearReleaseWithFeeAsDeployer.lock(await deployer.getAddress(), ethers.utils.parseEther('100'), 100);

      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));

      await advanceBlockTo((await latestBlockNumber()).toNumber() + 1);

      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('1'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));
      
      await advanceBlockTo((await latestBlockNumber()).toNumber() + 1);

      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('2'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));

      before = await mockERC20.balanceOf(await deployer.getAddress());
      await linearReleaseWithFeeAsDeployer.claim();
      after = await mockERC20.balanceOf(await deployer.getAddress());
      expect(after).to.be.eq(before.add(pending.add(ethers.utils.parseEther('1'))));
      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('97'));

      await mockERC20AsDeployer.approve(linearReleaseWithFee.address, ethers.utils.parseEther('1000'));
      await linearReleaseWithFeeAsDeployer.lock(await deployer.getAddress(), ethers.utils.parseEther('1000'), 100);

      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('2'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('1097'));

      before = await mockERC20.balanceOf(await deployer.getAddress());
      await linearReleaseWithFeeAsDeployer.claim();
      after = await mockERC20.balanceOf(await deployer.getAddress());
      expect(after).to.be.eq(before.add(pending.add(ethers.utils.parseEther('11'))));
      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('1084'));

      await mockERC20AsDeployer.approve(linearReleaseWithFee.address, ethers.utils.parseEther('100'));
      await linearReleaseWithFeeAsDeployer.lock(await alice.getAddress(), ethers.utils.parseEther('100'), 0);
      
      pending = await linearReleaseWithFee.pending(await alice.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await alice.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('100'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));
      before = await mockERC20.balanceOf(await alice.getAddress());
      await linearReleaseWithFeeAsAlice.claim();
      after = await mockERC20.balanceOf(await alice.getAddress());
      expect(after).to.be.eq(before.add(pending));
      pending = await linearReleaseWithFee.pending(await alice.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await alice.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('0'));
      
      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('33'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('1084'));

      before = await mockERC20.balanceOf(await deployer.getAddress());
      await linearReleaseWithFeeAsDeployer.claim();
      after = await mockERC20.balanceOf(await deployer.getAddress());
      expect(after).to.be.eq(before.add(pending.add(ethers.utils.parseEther('11'))));
      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('1040'));

      await mockERC20AsDeployer.approve(linearReleaseWithFee.address, ethers.utils.parseEther('100'));
      await linearReleaseWithFeeAsDeployer.lock(await alice.getAddress(), ethers.utils.parseEther('100'), 1);
      
      pending = await linearReleaseWithFee.pending(await alice.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await alice.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));
      before = await mockERC20.balanceOf(await alice.getAddress());
      await linearReleaseWithFeeAsAlice.claim();
      after = await mockERC20.balanceOf(await alice.getAddress());
      expect(after).to.be.eq(before.add(pending.add(ethers.utils.parseEther('100'))));
      pending = await linearReleaseWithFee.pending(await alice.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await alice.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('0'));
      
      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('33'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('1040'));

      before = await mockERC20.balanceOf(await deployer.getAddress());
      await linearReleaseWithFeeAsDeployer.claim();
      after = await mockERC20.balanceOf(await deployer.getAddress());
      expect(after).to.be.eq(before.add(pending.add(ethers.utils.parseEther('11'))));
      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('996'));

      await mockERC20AsDeployer.approve(linearReleaseWithFee.address, ethers.utils.parseEther('100'));
      await linearReleaseWithFeeAsDeployer.lock(await alice.getAddress(), ethers.utils.parseEther('100'), 100);
      
      pending = await linearReleaseWithFee.pending(await alice.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await alice.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));
      before = await mockERC20.balanceOf(await alice.getAddress());
      await linearReleaseWithFeeAsAlice.claim();
      after = await mockERC20.balanceOf(await alice.getAddress());
      expect(after).to.be.eq(before.add(pending.add(ethers.utils.parseEther('1'))));
      pending = await linearReleaseWithFee.pending(await alice.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await alice.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('99'));
      
      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('33'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('996'));

      before = await mockERC20.balanceOf(await deployer.getAddress());
      await linearReleaseWithFeeAsDeployer.claim();
      after = await mockERC20.balanceOf(await deployer.getAddress());
      expect(after).to.be.eq(before.add(pending.add(ethers.utils.parseEther('11'))));
      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('952'));
    });
    
    it('case 2', async() => {
      await playTokenAsDeployer.mint(await deployer.getAddress(), ethers.utils.parseEther('1'));

      await mockERC20AsDeployer.approve(linearReleaseWithFee.address, ethers.utils.parseEther('100'));
      await linearReleaseWithFeeAsDeployer.lock(await deployer.getAddress(), ethers.utils.parseEther('100'), 0);

      let pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      let lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('100'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('100'));
      let before = await mockERC20.balanceOf(await deployer.getAddress());
      
      await expect(linearReleaseWithFeeAsDeployer.claim()).to.be.reverted;
      await playTokenAsDeployer.approve(linearReleaseWithFee.address, ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await deployer.getAddress())).to.be.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await linearReleaseWithFeeAsDeployer.claim();
      expect(await playToken.balanceOf(await deployer.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1'));

      let after = await mockERC20.balanceOf(await deployer.getAddress());
      expect(after).to.be.eq(before.add(pending));
      pending = await linearReleaseWithFee.pending(await deployer.getAddress());
      lockOf = await linearReleaseWithFee.lockOf(await deployer.getAddress());
      expect(pending).to.be.eq(ethers.utils.parseEther('0'));
      expect(lockOf).to.be.eq(ethers.utils.parseEther('0'));
    });
  })
});
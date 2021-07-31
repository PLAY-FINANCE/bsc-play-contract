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
  PlayToken,
  PlayToken__factory,
} from "../typechain";

chai.use(solidity);
const { expect } = chai;

describe("PlayToken", function() {
  this.timeout(0);
  // Accounts
  let deployer: Signer;
  let alice: Signer;
  
  let playToken: PlayToken;

  let playTokenAsDeployer: PlayToken;
  let playTokenAsAlice: PlayToken;

  beforeEach(async() => {
    [deployer, alice] = await ethers.getSigners();
    
    const PlayToken = (await ethers.getContractFactory(
      "PlayToken",
      deployer
    )) as PlayToken__factory;
    playToken = await PlayToken.deploy();
    await playToken.deployed();

    playTokenAsDeployer = PlayToken__factory.connect(playToken.address, deployer);
    playTokenAsAlice = PlayToken__factory.connect(playToken.address, alice);
  });

  context('PlayToken', async() => {
    it('should work', async() => {
        const cap = await playTokenAsDeployer.cap();

        expect (await playToken.balanceOf(await deployer.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));

        await expect(playTokenAsAlice.mint(await alice.getAddress(), ethers.utils.parseEther('1'))).to.be.reverted;

        await playTokenAsDeployer.manualMint(await deployer.getAddress(), ethers.utils.parseEther('1'));
        expect (await playToken.balanceOf(await deployer.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));

        await playTokenAsDeployer.mint(await deployer.getAddress(), ethers.utils.parseEther('1'));
        expect (await playToken.balanceOf(await deployer.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('2'));

        await expect(playTokenAsDeployer.manualMint(await deployer.getAddress(), ethers.utils.parseEther('20000000'))).to.be.revertedWith('mint limit exceeded');
        await playTokenAsDeployer.manualMint(await deployer.getAddress(), ethers.utils.parseEther('20000000').sub(ethers.utils.parseEther('1')));
        await playTokenAsDeployer.mint(await deployer.getAddress(), cap);
        expect (await playToken.balanceOf(await deployer.getAddress())).to.be.bignumber.eq(cap);
    });
  });
});
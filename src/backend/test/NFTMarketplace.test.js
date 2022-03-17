const { ethers } = require("hardhat");
const { expect } = require('chai');
const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)
describe("NFTMarketplace", function () {
    let deployer, addr1, addr2, nft, marketplace,addrs;
    let feePercent = 1;
    let URI = 'sample URI';
    beforeEach(async function () {
        const NFT = await ethers.getContractFactory("NFT");
        const Marketplace = await ethers.getContractFactory("Marketplace");

        [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

        nft = await NFT.deploy();
        marketplace = await Marketplace.deploy(feePercent)
    });
    describe('Deployment', () => {
        it("Should track name and symbol of the NFT collection", async function () {
            expect(await nft.name()).to.equal("Dapp NFT");
            expect(await nft.symbol()).to.equal("DAPP");

        })
    });
    describe('Minting NFTs', () => {
        it("Should track each minted NFT", async function () {
            await nft.connect(addr1).mint(URI);
            expect(await nft.tokenCount()).to.equal(1);
            expect(await nft.balanceOf(addr1.address)).to.equal(1);
            expect(await nft.tokenURI(1)).to.equal(URI);

            await nft.connect(addr2).mint(URI);
            expect(await nft.tokenCount()).to.equal(2);
            expect(await nft.balanceOf(addr2.address)).to.equal(1);
            expect(await nft.tokenURI(1)).to.equal(URI);

        })
    });

    describe("Making Marketplace items", async function () {
        beforeEach(async function () {
            await nft.connect(addr1).mint(URI);
            await nft.connect(addr1).setApprovalForAll(marketplace.address, true)
        }

        );
        it("Should track newly created item,transfer nft from seller to marketplace and emit offered event", async function () {
            await expect(marketplace.connect(addr1).makeItem(nft.address, 1, toWei(1)))
                .to.emit(marketplace, "Offered")
                .withArgs(
                    1,
                    nft.address,
                    1,
                    toWei(1),
                    addr1.address
                )
            expect(await nft.ownerOf(1)).to.equal(marketplace.address);

            expect(await marketplace.itemCount()).to.equal(1);


            const item = await marketplace.items(1);
            expect(item.itemId).to.equal(1);
            expect(item.nft).to.equal(nft.address);
            expect(item.tokenId).to.equal(1);
            expect(item.price).to.equal(toWei(1));
            expect(item.sold).to.equal(false);
        });
        it("Should fail if price is equal to zero", async function () {
            await expect(
                marketplace.connect(addr1).makeItem(nft.address, 1, 0)
            ).to.be.revertedWith("Price must be greater than zero")
        })
    })
    describe("Purchasing Marketplace items", async function () {
        let price = 2
        let fee = (feePercent/100)*price;

        beforeEach(async function () {
            await nft.connect(addr1).mint(URI);

            await nft.connect(addr1).setApprovalForAll(marketplace.address, true);

            await marketplace.connect(addr1).makeItem(nft.address, 1, toWei(2));

        });

        it("Should update item as sold,pay seller,transfer NFT to buyer,charge fees and emit a bought event", async function () {
            const sellerInitialEthBal = await addr1.getBalance();
            const feeAccountInitialEthBal = await deployer.getBalance();

            totalPriceToWei = await marketplace.getTotalPrice(1);
            await expect(marketplace.connect(addr2).purchaseItem(1, { value: totalPriceToWei }))
                .to.emit(marketplace, "Bought")
                .withArgs(
                    1,
                    nft.address,
                    1,
                    toWei(price),
                    addr1.address,
                    addr2.address
                )
            const sellerFinalEthBal = await addr1.getBalance()
            const feeAccountFinalEthBal = await deployer.getBalance()
            // Item should be marked as sold
            expect((await marketplace.items(1)).sold).to.equal(true)
            // Seller should receive payment for the price of the NFT sold.
            expect(+fromWei(sellerFinalEthBal)).to.equal(+price + +fromWei(sellerInitialEthBal))
            // The buyer should now own the nft
            expect(await nft.ownerOf(1)).to.equal(addr2.address);
        })
        it("Should fail for invalid item ids, sold items and when not enough ether is paid", async function () {
            totalPriceToWei = await marketplace.getTotalPrice(1);
            // fails for invalid item ids
            await expect(
              marketplace.connect(addr2).purchaseItem(2, {value: totalPriceToWei})
            ).to.be.revertedWith("item doesn't exist");
            await expect(
              marketplace.connect(addr2).purchaseItem(0, {value: totalPriceToWei})
            ).to.be.revertedWith("item doesn't exist");
            // Fails when not enough ether is paid with the transaction. 
            // In this instance, fails when buyer only sends enough ether to cover the price of the nft
            // not the additional market fee.
            await expect(
              marketplace.connect(addr2).purchaseItem(1, {value: toWei(price)})
            ).to.be.revertedWith("not enough ether to cover item price and market fee"); 
            // addr2 purchases item 1
            await marketplace.connect(addr2).purchaseItem(1, {value: totalPriceToWei})
            // addr3 tries purchasing item 1 after its been sold 
            const addr3 = addrs[0]
            await expect(
              marketplace.connect(addr3).purchaseItem(1, {value: totalPriceToWei})
            ).to.be.revertedWith("item already sold");
          });
    })
})
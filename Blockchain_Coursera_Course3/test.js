// Importing the smart contract Auction using the artifacts keyword.
var Auction = artifacts.require("./Auction.sol");

// Test suite
contract('AuctionContract', function (accounts) {

    var auctionInstance;

    // Test case 1 (provided): Contract deployment
    it("Contract deployment", function () {
        // Fetching the contract instance of our smart contract
        return Auction.deployed().then(function (instance) {
            // We save the instance in a global variable and all smart contract functions are called using this
            auctionInstance = instance;
            assert(auctionInstance !== undefined, 'Auction contract should be defined');
        });
    });

    // Test case 2 (provided): Should set bidders
    it("Should set bidders", function () {
        // Registering the bidder with account[1] and checking the details using getter.
        return auctionInstance.register({ from: accounts[1] }).then(function (result) {
            // Fetching the person's details whose personId is 0
            return auctionInstance.getPersonDetails(0);
        }).then(function (result) {
            // The address returned should be that of account[1]
            assert.equal(result[2], accounts[1], 'bidder address is set up correctly');
        });
    });

    /* Test case 3 (negative test): Should NOT allow to bid more than remaining tokens.
       We call the bid function with more than 5 tokens, which should throw a revert error. */
    it("Should NOT allow to bid more than remaining tokens", function () {
        // ** Start code here. **
        // account[1] has only 5 tokens, so bidding 6 tokens must revert.
        return auctionInstance.bid(0, 6, { from: accounts[1] }).then(function (result) {
            // If we reach here, the transaction did NOT revert -> the test should fail.
            throw ("Failed to check remaining tokens");
        }).catch(function (e) {
            if (e === "Failed to check remaining tokens") {
                // The require/revert did not trigger.
                assert(false);
            } else {
                // A revert error was thrown as expected.
                assert(true);
            }
        });
        // ** End code here. **
    });

    /* Test case 4 (negative test): Should NOT allow non owner to reveal winners.
       We call the revealWinners function from a non-owner account, which should revert. */
    it("Should NOT allow non owner to reveal winners", function () {
        // ** Start code here. **
        // account[1] is not the beneficiary/owner, so revealWinners must revert (onlyOwner modifier).
        return auctionInstance.revealWinners({ from: accounts[1] }).then(function (result) {
            // If we reach here, the onlyOwner check failed -> the test should fail.
            throw ("Failed to check owner in reveal winners");
        }).catch(function (e) {
            if (e === "Failed to check owner in reveal winners") {
                assert(false);
            } else {
                assert(true);
            }
        });
        // ** End code here. **
    });

    /* Test case 5 (positive test): Should set winners.
       We register the remaining bidders, place one bid each on a distinct item from a
       different account, then reveal the winners from the owner (account[0]) and assert
       that the winner of each item is set to the only bidder of that item. */
    it("Should set winners", function () {
        // ** Start code here. **
        // Register account[2] and account[3] (account[1] is already registered in test 2).
        return auctionInstance.register({ from: accounts[2] }).then(function (result) {
            return auctionInstance.register({ from: accounts[3] });
        }).then(function (result) {
            // account[1] bids 5 tokens on item 0
            return auctionInstance.bid(0, 5, { from: accounts[1] });
        }).then(function (result) {
            // account[2] bids 5 tokens on item 1
            return auctionInstance.bid(1, 5, { from: accounts[2] });
        }).then(function (result) {
            // account[3] bids 5 tokens on item 2
            return auctionInstance.bid(2, 5, { from: accounts[3] });
        }).then(function (result) {
            // Reveal winners from the owner account (account[0]).
            return auctionInstance.revealWinners({ from: accounts[0] });
        }).then(function (result) {
            // Winner of item 0 should be account[1] (only bidder).
            return auctionInstance.winners(0);
        }).then(function (result) {
            assert.equal(result, accounts[1], "winner of item 0 should be account[1]");
            // Winner of item 1 should be account[2] (only bidder).
            return auctionInstance.winners(1);
        }).then(function (result) {
            assert.equal(result, accounts[2], "winner of item 1 should be account[2]");
            // Winner of item 2 should be account[3] (only bidder).
            return auctionInstance.winners(2);
        }).then(function (result) {
            assert.equal(result, accounts[3], "winner of item 2 should be account[3]");
        });
        // ** End code here. **
    });

});

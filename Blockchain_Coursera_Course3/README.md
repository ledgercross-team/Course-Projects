# Course 3 Project: Test-driven Development of a Dapp (Auction)

Test-driven development of the Auction Dapp using the Truffle IDE.

## Deliverables
- **`Auction.sol`** — Part 1 (20%): the completed smart contract from Course 2, including the
  `onlyOwner` modifier on `revealWinners()` (required for Test 4 to pass).
- **`test.js`** — Part 2 (80%): the Truffle test script with 5 test cases. Submit **only this file**
  to the Coursera grader.

## The 5 tests
1. **Contract deployment** *(provided)* — verifies the contract instance is defined.
2. **Should set bidders** *(provided)* — registers account[1] and checks `getPersonDetails`.
3. **Should NOT allow to bid more than remaining tokens** — negative test; bidding 6 of 5 tokens reverts.
4. **Should NOT allow non owner to reveal winners** — negative test; `revealWinners` from a non-owner reverts.
5. **Should set winners** — positive flow; register, bid one item each, reveal from owner, assert winners.

## How to run locally (Truffle)
```bash
cd
cp CourseraDocs/Auction.zip .
unzip Auction.zip
# Replace contracts/Auction.sol with this folder's Auction.sol
cd Auction
truffle compile
truffle develop      # then inside the console:
# > migrate --reset
# > test
# or, from a normal shell against the dev chain:
truffle test
```

Expected output:
```
Contract: AuctionContract
  ✓ Contract deployment
  ✓ Should set bidders
  ✓ Should NOT allow to bid more than remaining tokens
  ✓ Should NOT allow non owner to reveal winners
  ✓ Should set winners

5 passing
```

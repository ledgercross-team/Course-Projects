// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ponytail: minimal mock for unit testing executeDCA
contract MockWETH {
    mapping(address => uint256) public balanceOf;

    function deposit() external payable {
        balanceOf[msg.sender] += msg.value;
    }

    function withdraw(uint256 wad) external {
        require(balanceOf[msg.sender] >= wad, "MockWETH: insufficient");
        balanceOf[msg.sender] -= wad;
        payable(msg.sender).transfer(wad);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        // ponytail: mock — no balance check, just credit recipient
        balanceOf[to] += amount;
        return true;
    }
}

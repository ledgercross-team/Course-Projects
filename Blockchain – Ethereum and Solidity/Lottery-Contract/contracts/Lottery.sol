// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract Lottery {
    address public manager;
    address[] public players;

    constructor() {
        manager = msg.sender;
    }

    function enter() external payable {
        require(
            msg.value >= 0.01 ether,
            "Minimum 0.01 ETH required"
        );

        players.push(msg.sender);
    }

    function random() private view returns (uint256) {
        return uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    players.length
                )
            )
        );
    }

    modifier restricted() {
        require(
            msg.sender == manager,
            "Only manager can call"
        );
        _;
    }

    function pickWinner() external restricted {
    require(
        players.length > 0,
        "No players entered"
    );

    uint256 index =
        random() % players.length;

    (bool success, ) = payable(players[index]).call{
        value: address(this).balance
    }("");

    require(success, "Transfer failed");

    players = new address[](0);
}

    function getPlayers()
        external
        view
        returns (address[] memory)
    {
        return players;
    }
}
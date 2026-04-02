pragma solidity ^0.8.0;

contract Lottery {
    address public manager;
    address[] public players;

    constructor() {
        manager = msg.sender;
    }

    function enter() public payable {
        require(msg.value > 0.01 ether, "Minimum 0.01 ETH required");
        players.push(msg.sender);
    }

    function random() private view returns(uint) {
        return uint(keccak256(abi.encodePacked(block.difficulty, block.timestamp, players)));
    }

    function pickWinner() public restricted {
        uint index = random()%players.length;
        players = new address[](0);
    }

    function getPlayers() public view returns (address[] memory) {
        return players;
    }

    modifier restricted() {
        require(msg.sender == manager);
        _;
    }
}
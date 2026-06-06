// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Campaign
 * @dev Manages a single crowdfunding campaign.
 */
contract Campaign is ReentrancyGuard {
    struct Request {
        string description;
        uint256 amount;
        address payable recipient;
        bool complete;
        uint256 approvalCount;
        mapping(address => bool) approvals;
    }

    // Custom Errors
    error OnlyManager();
    error MinimumContributionNotMet();
    error NotAnApprover();
    error RequestAlreadyApproved();
    error InsufficientApprovals();
    error RequestAlreadyCompleted();
    error InsufficientContractBalance();
    error TransferFailed();

    // State Variables
    address public manager;
    string public title;
    string public description;
    string public imageUrl;
    uint256 public fundingGoal;
    uint256 public minimumContribution;
    uint256 public approversCount;
    uint256 public requestsCount;

    mapping(address => bool) public approvers;
    mapping(uint256 => Request) public requests;

    // Events
    event ContributionReceived(address indexed contributor, uint256 amount);
    event RequestCreated(uint256 indexed requestId, string description, uint256 amount, address recipient);
    event RequestApproved(uint256 indexed requestId, address indexed approver);
    event RequestFinalized(uint256 indexed requestId, uint256 amount, address recipient);

    modifier restricted() {
        if (msg.sender != manager) revert OnlyManager();
        _;
    }

    constructor(
        address _manager,
        string memory _title,
        string memory _description,
        string memory _imageUrl,
        uint256 _fundingGoal,
        uint256 _minimumContribution
    ) {
        manager = _manager;
        title = _title;
        description = _description;
        imageUrl = _imageUrl;
        fundingGoal = _fundingGoal;
        minimumContribution = _minimumContribution;
    }

    /**
     * @dev Allows users to contribute ETH and become approvers.
     */
    function contribute() external payable nonReentrant {
        if (msg.value < minimumContribution) revert MinimumContributionNotMet();

        if (!approvers[msg.sender]) {
            approvers[msg.sender] = true;
            approversCount++;
        }

        emit ContributionReceived(msg.sender, msg.value);
    }

    /**
     * @dev Allows manager to create a spending request.
     */
    function createRequest(
        string memory _description,
        uint256 _amount,
        address payable _recipient
    ) external restricted {
        Request storage newRequest = requests[requestsCount++];
        newRequest.description = _description;
        newRequest.amount = _amount;
        newRequest.recipient = _recipient;
        newRequest.complete = false;
        newRequest.approvalCount = 0;

        emit RequestCreated(requestsCount - 1, _description, _amount, _recipient);
    }

    /**
     * @dev Allows approvers to approve a specific request.
     */
    function approveRequest(uint256 index) external {
        if (!approvers[msg.sender]) revert NotAnApprover();
        Request storage request = requests[index];
        if (request.approvals[msg.sender]) revert RequestAlreadyApproved();

        request.approvals[msg.sender] = true;
        request.approvalCount++;

        emit RequestApproved(index, msg.sender);
    }

    /**
     * @dev Allows manager to finalize an approved request and transfer funds.
     */
    function finalizeRequest(uint256 index) external restricted nonReentrant {
        Request storage request = requests[index];

        if (request.complete) revert RequestAlreadyCompleted();
        if (request.approvalCount <= (approversCount / 2)) revert InsufficientApprovals();
        if (address(this).balance < request.amount) revert InsufficientContractBalance();

        request.complete = true;
        (bool success, ) = request.recipient.call{value: request.amount}("");
        if (!success) revert TransferFailed();

        emit RequestFinalized(index, request.amount, request.recipient);
    }

    /**
     * @dev Returns details of a specific request.
     */
    function getRequest(uint256 index) external view returns (
        string memory, uint256, address, bool, uint256
    ) {
        Request storage request = requests[index];
        return (
            request.description,
            request.amount,
            request.recipient,
            request.complete,
            request.approvalCount
        );
    }

    /**
     * @dev Returns summary of campaign status.
     */
    function getSummary() external view returns (
        uint256, uint256, uint256, uint256, address, string memory, string memory, string memory
    ) {
        return (
            minimumContribution,
            address(this).balance,
            requestsCount,
            approversCount,
            manager,
            title,
            description,
            imageUrl
        );
    }
}

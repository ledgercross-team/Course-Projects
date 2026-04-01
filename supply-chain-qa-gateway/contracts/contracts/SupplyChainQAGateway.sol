// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SupplyChainQAGateway is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant BUYER_ROLE = keccak256("BUYER_ROLE");
    bytes32 public constant SUPPLIER_ROLE = keccak256("SUPPLIER_ROLE");
    bytes32 public constant WAREHOUSE_MANAGER_ROLE =
        keccak256("WAREHOUSE_MANAGER_ROLE");

    enum RequestStatus {
        Pending,
        Approved,
        Rejected,
        Paid
    }

    struct DeliveryRequest {
        uint256 id;
        string shipmentId;
        string description;
        uint256 amount;
        address buyer;
        address supplier;
        address approver;
        RequestStatus status;
        uint256 createdAt;
        uint256 reviewedAt;
        uint256 paidAt;
    }

    uint256 public nextRequestId;

    mapping(uint256 => DeliveryRequest) private requests;
    mapping(address => uint256) private buyerAvailableBalance;
    mapping(address => uint256) private buyerReservedBalance;

    mapping(address => uint256[]) private buyerRequestIds;
    mapping(address => uint256[]) private supplierRequestIds;
    mapping(address => uint256[]) private approverRequestIds;

    event FundsDeposited(address indexed buyer, uint256 amount);
    event FundsWithdrawn(address indexed buyer, uint256 amount);
    event RequestCreated(
        uint256 indexed requestId,
        string shipmentId,
        address indexed buyer,
        address indexed supplier,
        address approver,
        uint256 amount
    );
    event RequestApproved(
        uint256 indexed requestId,
        address indexed approver,
        uint256 reviewedAt
    );
    event RequestRejected(
        uint256 indexed requestId,
        address indexed approver,
        uint256 reviewedAt
    );
    event PaymentReleased(
        uint256 indexed requestId,
        address indexed supplier,
        uint256 amount,
        uint256 paidAt
    );
    event ContractPaused(address indexed admin);
    event ContractUnpaused(address indexed admin);

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientAvailableBalance();
    error InvalidApprover();
    error InvalidBuyer();
    error InvalidRequestStatus();
    error NotAssignedApprover();
    error PaymentTransferFailed();

    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
    }

    function grantBuyerRole(
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _grantRole(BUYER_ROLE, account);
    }

    function grantSupplierRole(
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _grantRole(SUPPLIER_ROLE, account);
    }

    function grantWarehouseManagerRole(
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _grantRole(WAREHOUSE_MANAGER_ROLE, account);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        emit ContractPaused(msg.sender);
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    function depositFunds()
        external
        payable
        onlyRole(BUYER_ROLE)
        whenNotPaused
    {
        if (msg.value == 0) revert ZeroAmount();

        buyerAvailableBalance[msg.sender] += msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }

    function withdrawUnusedFunds(
        uint256 amount
    ) external onlyRole(BUYER_ROLE) nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (buyerAvailableBalance[msg.sender] < amount)
            revert InsufficientAvailableBalance();

        buyerAvailableBalance[msg.sender] -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert PaymentTransferFailed();

        emit FundsWithdrawn(msg.sender, amount);
    }

    function createDeliveryRequest(
        string calldata shipmentId,
        string calldata description,
        uint256 amount,
        address buyer,
        address approver
    )
        external
        onlyRole(SUPPLIER_ROLE)
        whenNotPaused
        returns (uint256 requestId)
    {
        if (buyer == address(0)) revert ZeroAddress();
        if (approver == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (!hasRole(BUYER_ROLE, buyer)) revert InvalidBuyer();
        if (!hasRole(WAREHOUSE_MANAGER_ROLE, approver))
            revert InvalidApprover();
        if (buyerAvailableBalance[buyer] < amount)
            revert InsufficientAvailableBalance();

        buyerAvailableBalance[buyer] -= amount;
        buyerReservedBalance[buyer] += amount;

        requestId = nextRequestId;

        requests[requestId] = DeliveryRequest({
            id: requestId,
            shipmentId: shipmentId,
            description: description,
            amount: amount,
            buyer: buyer,
            supplier: msg.sender,
            approver: approver,
            status: RequestStatus.Pending,
            createdAt: block.timestamp,
            reviewedAt: 0,
            paidAt: 0
        });

        buyerRequestIds[buyer].push(requestId);
        supplierRequestIds[msg.sender].push(requestId);
        approverRequestIds[approver].push(requestId);

        nextRequestId += 1;

        emit RequestCreated(
            requestId,
            shipmentId,
            buyer,
            msg.sender,
            approver,
            amount
        );
    }

    function approveRequest(
        uint256 requestId
    ) external nonReentrant whenNotPaused {
        DeliveryRequest storage request = requests[requestId];

        if (request.approver != msg.sender) revert NotAssignedApprover();
        if (request.status != RequestStatus.Pending)
            revert InvalidRequestStatus();

        request.status = RequestStatus.Approved;
        request.reviewedAt = block.timestamp;

        emit RequestApproved(requestId, msg.sender, block.timestamp);

        buyerReservedBalance[request.buyer] -= request.amount;

        request.status = RequestStatus.Paid;
        request.paidAt = block.timestamp;

        (bool success, ) = payable(request.supplier).call{
            value: request.amount
        }("");
        if (!success) revert PaymentTransferFailed();

        emit PaymentReleased(
            requestId,
            request.supplier,
            request.amount,
            request.paidAt
        );
    }

    function rejectRequest(uint256 requestId) external whenNotPaused {
        DeliveryRequest storage request = requests[requestId];

        if (request.approver != msg.sender) revert NotAssignedApprover();
        if (request.status != RequestStatus.Pending)
            revert InvalidRequestStatus();

        request.status = RequestStatus.Rejected;
        request.reviewedAt = block.timestamp;

        buyerReservedBalance[request.buyer] -= request.amount;
        buyerAvailableBalance[request.buyer] += request.amount;

        emit RequestRejected(requestId, msg.sender, block.timestamp);
    }

    function getRequest(
        uint256 requestId
    ) external view returns (DeliveryRequest memory) {
        return requests[requestId];
    }

    function getBuyerRequestIds(
        address buyer
    ) external view returns (uint256[] memory) {
        return buyerRequestIds[buyer];
    }

    function getSupplierRequestIds(
        address supplier
    ) external view returns (uint256[] memory) {
        return supplierRequestIds[supplier];
    }

    function getApproverRequestIds(
        address approver
    ) external view returns (uint256[] memory) {
        return approverRequestIds[approver];
    }

    function getBuyerAvailableBalance(
        address buyer
    ) external view returns (uint256) {
        return buyerAvailableBalance[buyer];
    }

    function getBuyerReservedBalance(
        address buyer
    ) external view returns (uint256) {
        return buyerReservedBalance[buyer];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

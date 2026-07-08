// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title WillRegistry
/// @notice Prototype contract for SecureChain Will. Stores only metadata/hashes
///         of digital wills; the actual documents live encrypted on IPFS.
/// @dev This is a university capstone prototype and is NOT a substitute for a
///      legally binding will system.
contract WillRegistry {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    enum WillStatus {
        Created,
        WitnessApproved,
        Verified,
        Released,
        Rejected
    }

    struct Will {
        uint256 id;
        address creator;
        address witness;
        address beneficiary;
        string ipfsCID;
        string documentHash; // SHA-256 hash of the encrypted document
        WillStatus status;
        uint256 createdAt;
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    address public admin;
    uint256 private nextWillId = 1;

    mapping(uint256 => Will) private wills;
    mapping(address => uint256[]) private willsByCreator;
    mapping(address => uint256[]) private willsByWitness;
    mapping(address => uint256[]) private willsByBeneficiary;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event WillCreated(
        uint256 indexed id,
        address indexed creator,
        address indexed witness,
        address beneficiary,
        string ipfsCID,
        string documentHash,
        uint256 createdAt
    );

    event WitnessApproved(uint256 indexed id, address indexed witness, uint256 timestamp);
    event WillRejected(uint256 indexed id, address indexed witness, uint256 timestamp);
    event DeathVerified(uint256 indexed id, address indexed admin, uint256 timestamp);
    event WillReleased(uint256 indexed id, address indexed admin, uint256 timestamp);
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "WillRegistry: caller is not admin");
        _;
    }

    modifier onlyCreator(uint256 _id) {
        require(wills[_id].creator == msg.sender, "WillRegistry: caller is not creator");
        _;
    }

    modifier onlyWitness(uint256 _id) {
        require(wills[_id].witness == msg.sender, "WillRegistry: caller is not witness");
        _;
    }

    modifier onlyBeneficiary(uint256 _id) {
        require(wills[_id].beneficiary == msg.sender, "WillRegistry: caller is not beneficiary");
        _;
    }

    modifier willExists(uint256 _id) {
        require(wills[_id].creator != address(0), "WillRegistry: will does not exist");
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor() {
        admin = msg.sender;
    }

    // ---------------------------------------------------------------------
    // Core functions
    // ---------------------------------------------------------------------

    /// @notice Creates a new will record on-chain.
    function createWill(
        address _witness,
        address _beneficiary,
        string calldata _ipfsCID,
        string calldata _documentHash
    ) external returns (uint256) {
        require(_witness != address(0), "WillRegistry: invalid witness");
        require(_beneficiary != address(0), "WillRegistry: invalid beneficiary");
        require(_witness != msg.sender, "WillRegistry: witness cannot be creator");
        require(_beneficiary != msg.sender, "WillRegistry: beneficiary cannot be creator");
        require(bytes(_ipfsCID).length > 0, "WillRegistry: CID required");
        require(bytes(_documentHash).length > 0, "WillRegistry: hash required");

        uint256 id = nextWillId++;

        wills[id] = Will({
            id: id,
            creator: msg.sender,
            witness: _witness,
            beneficiary: _beneficiary,
            ipfsCID: _ipfsCID,
            documentHash: _documentHash,
            status: WillStatus.Created,
            createdAt: block.timestamp
        });

        willsByCreator[msg.sender].push(id);
        willsByWitness[_witness].push(id);
        willsByBeneficiary[_beneficiary].push(id);

        emit WillCreated(id, msg.sender, _witness, _beneficiary, _ipfsCID, _documentHash, block.timestamp);
        return id;
    }

    /// @notice Witness approves a will they were assigned to.
    function approveByWitness(uint256 _id) external willExists(_id) onlyWitness(_id) {
        Will storage w = wills[_id];
        require(w.status == WillStatus.Created, "WillRegistry: invalid status for approval");
        w.status = WillStatus.WitnessApproved;
        emit WitnessApproved(_id, msg.sender, block.timestamp);
    }

    /// @notice Witness rejects a will they were assigned to.
    function rejectByWitness(uint256 _id) external willExists(_id) onlyWitness(_id) {
        Will storage w = wills[_id];
        require(w.status == WillStatus.Created, "WillRegistry: invalid status for rejection");
        w.status = WillStatus.Rejected;
        emit WillRejected(_id, msg.sender, block.timestamp);
    }

    /// @notice Admin verifies the death/condition required for release.
    function verifyDeath(uint256 _id) external willExists(_id) onlyAdmin {
        Will storage w = wills[_id];
        require(w.status == WillStatus.WitnessApproved, "WillRegistry: witness approval required first");
        w.status = WillStatus.Verified;
        emit DeathVerified(_id, msg.sender, block.timestamp);
    }

    /// @notice Admin releases the will, granting the beneficiary access.
    function releaseWill(uint256 _id) external willExists(_id) onlyAdmin {
        Will storage w = wills[_id];
        require(w.status == WillStatus.Verified, "WillRegistry: death verification required first");
        w.status = WillStatus.Released;
        emit WillReleased(_id, msg.sender, block.timestamp);
    }

    /// @notice Updates the CID/hash of a will before witness approval (creator only).
    function updateWill(
        uint256 _id,
        string calldata _ipfsCID,
        string calldata _documentHash
    ) external willExists(_id) onlyCreator(_id) {
        Will storage w = wills[_id];
        require(w.status == WillStatus.Created, "WillRegistry: cannot edit after witness action");
        require(bytes(_ipfsCID).length > 0, "WillRegistry: CID required");
        require(bytes(_documentHash).length > 0, "WillRegistry: hash required");
        w.ipfsCID = _ipfsCID;
        w.documentHash = _documentHash;
    }

    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "WillRegistry: invalid admin");
        emit AdminChanged(admin, _newAdmin);
        admin = _newAdmin;
    }

    // ---------------------------------------------------------------------
    // View functions
    // ---------------------------------------------------------------------

    /// @notice Returns full will data. CID is only meaningfully usable once released,
    ///         but the struct itself is public metadata (no document contents).
    function getWill(uint256 _id) external view willExists(_id) returns (Will memory) {
        return wills[_id];
    }

    /// @notice Returns whether `_caller` is allowed to fetch the encrypted document
    ///         (i.e., decrypt it off-chain) for a given will.
    function canAccess(uint256 _id, address _caller) external view willExists(_id) returns (bool) {
        Will storage w = wills[_id];
        if (_caller == admin) return true;
        if (_caller == w.creator) return true;
        if (_caller == w.witness) return true;
        if (_caller == w.beneficiary && w.status == WillStatus.Released) return true;
        return false;
    }

    function getWillsByCreator(address _creator) external view returns (uint256[] memory) {
        return willsByCreator[_creator];
    }

    function getWillsByWitness(address _witness) external view returns (uint256[] memory) {
        return willsByWitness[_witness];
    }

    function getWillsByBeneficiary(address _beneficiary) external view returns (uint256[] memory) {
        return willsByBeneficiary[_beneficiary];
    }

    function totalWills() external view returns (uint256) {
        return nextWillId - 1;
    }
}

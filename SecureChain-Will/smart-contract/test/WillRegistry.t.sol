// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/WillRegistry.sol";

contract WillRegistryTest is Test {
    WillRegistry public registry;

    address admin = address(this);
    address creator = address(0x1);
    address witness = address(0x2);
    address beneficiary = address(0x3);
    address stranger = address(0x4);

    string constant CID = "QmTestCid123456789";
    string constant HASH = "sha256:abcdef1234567890";

    function setUp() public {
        registry = new WillRegistry();
    }

    // ---------------------------------------------------------------
    // Create Will
    // ---------------------------------------------------------------
    function testCreateWill() public {
        vm.prank(creator);
        uint256 id = registry.createWill(witness, beneficiary, CID, HASH);

        WillRegistry.Will memory w = registry.getWill(id);
        assertEq(w.creator, creator);
        assertEq(w.witness, witness);
        assertEq(w.beneficiary, beneficiary);
        assertEq(w.ipfsCID, CID);
        assertEq(w.documentHash, HASH);
        assertEq(uint256(w.status), uint256(WillRegistry.WillStatus.Created));
    }

    function testCreateWillRevertsOnInvalidWitness() public {
        vm.prank(creator);
        vm.expectRevert("WillRegistry: invalid witness");
        registry.createWill(address(0), beneficiary, CID, HASH);
    }

    function testCreateWillRevertsWhenWitnessIsCreator() public {
        vm.prank(creator);
        vm.expectRevert("WillRegistry: witness cannot be creator");
        registry.createWill(creator, beneficiary, CID, HASH);
    }

    // ---------------------------------------------------------------
    // Witness Approval
    // ---------------------------------------------------------------
    function testWitnessApproval() public {
        vm.prank(creator);
        uint256 id = registry.createWill(witness, beneficiary, CID, HASH);

        vm.prank(witness);
        registry.approveByWitness(id);

        WillRegistry.Will memory w = registry.getWill(id);
        assertEq(uint256(w.status), uint256(WillRegistry.WillStatus.WitnessApproved));
    }

    function testWitnessApprovalRevertsForNonWitness() public {
        vm.prank(creator);
        uint256 id = registry.createWill(witness, beneficiary, CID, HASH);

        vm.prank(stranger);
        vm.expectRevert("WillRegistry: caller is not witness");
        registry.approveByWitness(id);
    }

    // ---------------------------------------------------------------
    // Admin Verification
    // ---------------------------------------------------------------
    function testAdminVerification() public {
        uint256 id = _createAndApprove();

        registry.verifyDeath(id); // called as admin (address(this))

        WillRegistry.Will memory w = registry.getWill(id);
        assertEq(uint256(w.status), uint256(WillRegistry.WillStatus.Verified));
    }

    function testAdminVerificationRevertsIfNotApproved() public {
        vm.prank(creator);
        uint256 id = registry.createWill(witness, beneficiary, CID, HASH);

        vm.expectRevert("WillRegistry: witness approval required first");
        registry.verifyDeath(id);
    }

    function testAdminVerificationRevertsForNonAdmin() public {
        uint256 id = _createAndApprove();

        vm.prank(stranger);
        vm.expectRevert("WillRegistry: caller is not admin");
        registry.verifyDeath(id);
    }

    // ---------------------------------------------------------------
    // Release
    // ---------------------------------------------------------------
    function testReleaseWill() public {
        uint256 id = _createAndApprove();
        registry.verifyDeath(id);
        registry.releaseWill(id);

        WillRegistry.Will memory w = registry.getWill(id);
        assertEq(uint256(w.status), uint256(WillRegistry.WillStatus.Released));
    }

    function testReleaseWillRevertsIfNotVerified() public {
        uint256 id = _createAndApprove();
        vm.expectRevert("WillRegistry: death verification required first");
        registry.releaseWill(id);
    }

    // ---------------------------------------------------------------
    // Unauthorized Access
    // ---------------------------------------------------------------
    function testUnauthorizedCannotApprove() public {
        vm.prank(creator);
        uint256 id = registry.createWill(witness, beneficiary, CID, HASH);

        vm.prank(stranger);
        vm.expectRevert("WillRegistry: caller is not witness");
        registry.approveByWitness(id);
    }

    function testUnauthorizedCannotRelease() public {
        uint256 id = _createAndApprove();
        registry.verifyDeath(id);

        vm.prank(stranger);
        vm.expectRevert("WillRegistry: caller is not admin");
        registry.releaseWill(id);
    }

    // ---------------------------------------------------------------
    // Beneficiary Access
    // ---------------------------------------------------------------
    function testBeneficiaryAccessOnlyAfterRelease() public {
        uint256 id = _createAndApprove();

        assertFalse(registry.canAccess(id, beneficiary));

        registry.verifyDeath(id);
        assertFalse(registry.canAccess(id, beneficiary));

        registry.releaseWill(id);
        assertTrue(registry.canAccess(id, beneficiary));
    }

    // ---------------------------------------------------------------
    // Fake User Access
    // ---------------------------------------------------------------
    function testFakeUserCannotAccessUnreleasedWill() public {
        uint256 id = _createAndApprove();
        registry.verifyDeath(id);
        registry.releaseWill(id);

        assertFalse(registry.canAccess(id, stranger));
    }

    function testGetWillRevertsForNonexistentWill() public {
        vm.expectRevert("WillRegistry: will does not exist");
        registry.getWill(999);
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------
    function _createAndApprove() internal returns (uint256 id) {
        vm.prank(creator);
        id = registry.createWill(witness, beneficiary, CID, HASH);

        vm.prank(witness);
        registry.approveByWitness(id);
    }
}

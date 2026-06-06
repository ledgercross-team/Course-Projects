// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./Campaign.sol";

/**
 * @title CampaignFactory
 * @dev Factory for deploying individual Campaign instances.
 */
contract CampaignFactory {
    address[] public deployedCampaigns;

    event CampaignCreated(
        address indexed campaignAddress,
        address indexed manager,
        string title,
        uint256 fundingGoal
    );

    /**
     * @dev Deploys a new Campaign contract.
     */
    function createCampaign(
        string memory title,
        string memory description,
        string memory imageUrl,
        uint256 fundingGoal,
        uint256 minimumContribution
    ) external {
        Campaign newCampaign = new Campaign(
            msg.sender,
            title,
            description,
            imageUrl,
            fundingGoal,
            minimumContribution
        );
        deployedCampaigns.push(address(newCampaign));

        emit CampaignCreated(address(newCampaign), msg.sender, title, fundingGoal);
    }

    /**
     * @dev Returns addresses of all deployed campaigns.
     */
    function getDeployedCampaigns() external view returns (address[] memory) {
        return deployedCampaigns;
    }
}

'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { FACTORY_ADDRESS } from '@/constants';
import { CAMPAIGN_FACTORY_ABI, CAMPAIGN_ABI } from '@/constants/abis';
import { CampaignCard } from '@/components/campaign-card';
import { Skeleton } from '@/components/ui/skeleton';
import { hardhat } from 'wagmi/chains';

export default function HomePage() {
  const { 
    data: deployedCampaigns, 
    isLoading: isListLoading, 
  } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: CAMPAIGN_FACTORY_ABI,
    functionName: 'getDeployedCampaigns',
    chainId: hardhat.id,
  });

  const { 
    data: campaignSummaries, 
    isLoading: isSummariesLoading, 
  } = useReadContracts({
    contracts: (deployedCampaigns ?? []).map((address) => ({
      address,
      abi: CAMPAIGN_ABI,
      functionName: 'getSummary',
      chainId: hardhat.id,
    })),
    query: {
      enabled: !!deployedCampaigns && deployedCampaigns.length > 0,
    }
  });

  const isLoading = isListLoading || (!!deployedCampaigns && deployedCampaigns.length > 0 && isSummariesLoading);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Discover Campaigns</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Discover Campaigns</h1>
      </div>

      {!deployedCampaigns || deployedCampaigns.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No campaigns found. Be the first to start one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deployedCampaigns.map((address, index) => {
            const summary = campaignSummaries?.[index]?.result;
            if (!summary || !Array.isArray(summary)) return null;
            
            // summary: [minContribution, balance, requestsCount, approversCount, manager, title, description, imageUrl, fundingGoal]
            return (
              <CampaignCard
                key={address}
                address={address}
                title={summary[5] as string}
                description={summary[6] as string}
                imageUrl={summary[7] as string}
                fundingGoal={summary[8] as bigint}
                balance={summary[1] as bigint}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

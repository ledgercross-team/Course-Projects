'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { FACTORY_ADDRESS } from '@/constants';
import { CAMPAIGN_FACTORY_ABI, CAMPAIGN_ABI } from '@/constants/abis';
import { CampaignCard } from '@/components/campaign-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { hardhat } from 'wagmi/chains';

export default function HomePage() {
  const { 
    data: deployedCampaigns, 
    isLoading: isListLoading,
    isError: isListError,
    error: listError,
  } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: CAMPAIGN_FACTORY_ABI,
    functionName: 'getDeployedCampaigns',
    chainId: hardhat.id,
  });

  const { 
    data: campaignSummaries, 
    isLoading: isSummariesLoading,
    isError: isSummariesError,
    error: summariesError,
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
  const isError = isListError || isSummariesError;

  console.log('Homepage State:', {
    factoryAddress: FACTORY_ADDRESS,
    deployedCampaigns,
    isListLoading,
    isListError,
    listError: listError?.message,
    isSummariesLoading,
    isSummariesError,
    summariesError: summariesError?.message,
    isLoading,
    isError
  });

  if (isLoading && !isError) {
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

  if (isError) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Discover Campaigns</h1>
        <div className="bg-destructive/10 p-6 rounded-lg border border-destructive/20 text-destructive text-center">
          <p className="font-semibold">Error loading campaigns</p>
          <p className="text-sm opacity-80">{listError?.message || summariesError?.message}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
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
            const summaryResult = campaignSummaries?.[index];
            const summary = summaryResult?.result;
            
            if (summaryResult?.status === 'failure') {
              console.error(`Failed to load summary for campaign ${address}:`, summaryResult.error);
              return null;
            }

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

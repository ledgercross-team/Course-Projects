'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { FACTORY_ADDRESS } from '@/constants';
import { CAMPAIGN_FACTORY_ABI, CAMPAIGN_ABI } from '@/constants/abis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { formatEther } from 'viem';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { data: deployedCampaigns, isLoading: isListLoading } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: CAMPAIGN_FACTORY_ABI,
    functionName: 'getDeployedCampaigns',
  });

  const { data: summaries, isLoading: isSummariesLoading } = useReadContracts({
    contracts: (deployedCampaigns ?? []).map((address) => ({
      address,
      abi: CAMPAIGN_ABI,
      functionName: 'getSummary',
    })),
  });

  if (isListLoading || isSummariesLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  const totalCampaigns = deployedCampaigns?.length || 0;
  let totalEthRaised = 0n;
  let totalFundingGoal = 0n;
  
  summaries?.forEach((s) => {
    if (s.result && Array.isArray(s.result)) {
      totalEthRaised += s.result[1] as bigint; // balance
      totalFundingGoal += s.result[8] as bigint; // fundingGoal
    }
  });

  const overallProgress = totalFundingGoal > 0n ? Number((totalEthRaised * 100n) / totalFundingGoal) : 0;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totalCampaigns}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total ETH Raised</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-4xl font-bold">{formatEther(totalEthRaised)} ETH</p>
            <Progress value={Math.min(overallProgress, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground">Goal: {formatEther(totalFundingGoal)} ETH ({overallProgress}%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Platform Backers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {summaries?.reduce((acc, s) => acc + (Array.isArray(s.result) ? Number(s.result[3]) : 0), 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="p-10 text-center text-muted-foreground">
        <p>Advanced charts and contribution statistics will be available once more data is indexed.</p>
      </Card>
    </div>
  );
}

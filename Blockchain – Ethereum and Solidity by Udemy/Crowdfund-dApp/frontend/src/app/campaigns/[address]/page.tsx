'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { CAMPAIGN_ABI } from '@/constants/abis';
import { formatEther, parseEther } from 'viem';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { useEffect } from 'react';

const contributeSchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Must be a positive number'),
});

type ContributeFormValues = z.infer<typeof contributeSchema>;

export default function CampaignDetailsPage() {
  const params = useParams();
  const address = params.address as `0x${string}`;
  const { address: userAddress } = useAccount();

  const { data: summary, isLoading, refetch } = useReadContract({
    address,
    abi: CAMPAIGN_ABI,
    functionName: 'getSummary',
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContributeFormValues>({
    resolver: zodResolver(contributeSchema),
  });

  useEffect(() => {
    if (isSuccess) {
      toast.success('Contribution successful!');
      reset();
      refetch();
    }
  }, [isSuccess, reset, refetch]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  if (!summary) return <div>Campaign not found.</div>;

  // summary: [minContribution, balance, requestsCount, approversCount, manager, title, description, imageUrl, fundingGoal]
  const [minContribution, balance, requestsCount, approversCount, manager, title, description, imageUrl, fundingGoal] = (summary as unknown as any[]) || [];
  
  const progress = Number(fundingGoal) > 0 ? Math.min((Number(balance) / Number(fundingGoal)) * 100, 100) : 0; 
  const formattedGoal = fundingGoal ? formatEther(fundingGoal as bigint) : '0';
  const onSubmit = (values: ContributeFormValues) => {
    if (parseEther(values.amount) < (minContribution as bigint)) {
      toast.error(`Minimum contribution is ${formatEther(minContribution as bigint)} ETH`);
      return;
    }

    writeContract({
      address,
      abi: CAMPAIGN_ABI,
      functionName: 'contribute',
      value: parseEther(values.amount),
    });
  };

  return (
    <div className="space-y-8">
      <div className="relative h-[400px] w-full rounded-xl overflow-hidden">
        <Image
          src={(imageUrl as string) || "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80"}
          alt={title as string}
          fill
          className="object-cover"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">{title as string}</h1>
            <p className="text-sm text-muted-foreground">Managed by: {manager as string}</p>
          </div>

          <div className="prose dark:prose-invert max-w-none">
            <p className="text-lg leading-relaxed">{description as string}</p>
          </div>

          <div className="flex gap-4">
            <Button asChild variant="outline">
              <Link href={`/campaigns/${address}/requests`}>View Requests ({requestsCount.toString()})</Link>
            </Button>
            {userAddress?.toLowerCase() === (manager as string).toLowerCase() && (
              <Button asChild>
                <Link href={`/campaigns/${address}/requests/new`}>Create Request</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Status</CardTitle>
              <CardDescription>Support this project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-2xl font-bold">
                  <span>{formatEther(balance as bigint)} ETH</span>
                  <span className="text-muted-foreground text-sm self-end">Goal: {formattedGoal} ETH</span>
                </div>
                <p className="text-sm text-muted-foreground">raised so far</p>
                <Progress value={progress} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 border rounded-lg">
                  <p className="text-xl font-bold">{approversCount.toString()}</p>
                  <p className="text-xs text-muted-foreground">Backers</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xl font-bold">{formatEther(minContribution as bigint)}</p>
                  <p className="text-xs text-muted-foreground">Min. ETH</p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="amount">Contribution Amount (ETH)</Label>
                  <Input id="amount" {...register('amount')} placeholder="0.5" />
                  {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isPending || isConfirming}>
                  {isPending || isConfirming ? 'Contributing...' : 'Back this project'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

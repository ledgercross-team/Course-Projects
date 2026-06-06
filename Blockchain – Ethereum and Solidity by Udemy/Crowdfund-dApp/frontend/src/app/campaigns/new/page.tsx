'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { FACTORY_ADDRESS } from '@/constants';
import { CAMPAIGN_FACTORY_ABI } from '@/constants/abis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

const campaignSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  imageUrl: z.string().url('Must be a valid URL'),
  fundingGoal: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Must be a positive number'),
  minimumContribution: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Must be a non-negative number'),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

export default function NewCampaignPage() {
  const router = useRouter();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { register, handleSubmit, formState: { errors } } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
  });

  useEffect(() => {
    if (isSuccess) {
      toast.success('Campaign created successfully!');
      router.push('/');
    }
  }, [isSuccess, router]);

  const onSubmit = (values: CampaignFormValues) => {
    writeContract({
      address: FACTORY_ADDRESS,
      abi: CAMPAIGN_FACTORY_ABI,
      functionName: 'createCampaign',
      args: [
        values.title,
        values.description,
        values.imageUrl,
        parseEther(values.fundingGoal),
        parseEther(values.minimumContribution),
      ],
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create a New Campaign</CardTitle>
          <CardDescription>Fill out the details below to start your crowdfunding journey.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Campaign Title</Label>
              <Input id="title" {...register('title')} placeholder="My Awesome Project" />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} placeholder="Tell us more about your project..." />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input id="imageUrl" {...register('imageUrl')} placeholder="https://example.com/image.jpg" />
              {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fundingGoal">Funding Goal (ETH)</Label>
                <Input id="fundingGoal" {...register('fundingGoal')} placeholder="10" />
                {errors.fundingGoal && <p className="text-sm text-destructive">{errors.fundingGoal.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumContribution">Minimum Contribution (ETH)</Label>
                <Input id="minimumContribution" {...register('minimumContribution')} placeholder="0.1" />
                {errors.minimumContribution && <p className="text-sm text-destructive">{errors.minimumContribution.message}</p>}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isPending || isConfirming}>
              {isPending || isConfirming ? 'Creating...' : 'Create Campaign'}
            </Button>

            {error && <p className="text-sm text-destructive mt-4">Error: {error.message}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

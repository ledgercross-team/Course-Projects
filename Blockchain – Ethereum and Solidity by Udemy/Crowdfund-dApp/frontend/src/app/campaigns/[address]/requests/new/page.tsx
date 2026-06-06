'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { CAMPAIGN_ABI } from '@/constants/abis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

const requestSchema = z.object({
  description: z.string().min(5, 'Description must be at least 5 characters'),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Must be a positive number'),
  recipient: z.string().refine((val) => /^0x[a-fA-F0-9]{40}$/.test(val), 'Must be a valid Ethereum address'),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export default function NewRequestPage() {
  const router = useRouter();
  const params = useParams();
  const address = params.address as `0x${string}`;

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { register, handleSubmit, formState: { errors } } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
  });

  useEffect(() => {
    if (isSuccess) {
      toast.success('Request created successfully!');
      router.push(`/campaigns/${address}/requests`);
    }
  }, [isSuccess, router, address]);

  const onSubmit = (values: RequestFormValues) => {
    writeContract({
      address,
      abi: CAMPAIGN_ABI,
      functionName: 'createRequest',
      args: [
        values.description,
        parseEther(values.amount),
        values.recipient as `0x${string}`,
      ],
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create a Spending Request</CardTitle>
          <CardDescription>Only the campaign manager can create requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} placeholder="Buying hardware components..." />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (ETH)</Label>
              <Input id="amount" {...register('amount')} placeholder="1.5" />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input id="recipient" {...register('recipient')} placeholder="0x..." />
              {errors.recipient && <p className="text-sm text-destructive">{errors.recipient.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isPending || isConfirming}>
              {isPending || isConfirming ? 'Creating...' : 'Create Request'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

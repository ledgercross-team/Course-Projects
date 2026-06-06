'use client';

import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CAMPAIGN_ABI } from '@/constants/abis';
import { useParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatEther } from 'viem';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { hardhat } from 'wagmi/chains';

export default function RequestsPage() {
  const params = useParams();
  const address = params.address as `0x${string}`;

  const { data: requestsCount, refetch: refetchCount } = useReadContract({
    address,
    abi: CAMPAIGN_ABI,
    functionName: 'requestsCount',
    chainId: hardhat.id,
  });

  const { data: approversCount } = useReadContract({
    address,
    abi: CAMPAIGN_ABI,
    functionName: 'approversCount',
    chainId: hardhat.id,
  });

  const { data: requestsData, isLoading, refetch: refetchRequests } = useReadContracts({
    contracts: Array.from({ length: Number(requestsCount || 0) }).map((_, i) => ({
      address,
      abi: CAMPAIGN_ABI,
      functionName: 'getRequest',
      args: [BigInt(i)],
      chainId: hardhat.id,
    })),
    query: {
      enabled: !!requestsCount && Number(requestsCount) > 0,
    }
  });

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      toast.success('Transaction successful!');
      refetchCount();
      refetchRequests();
    }
  }, [isSuccess, refetchCount, refetchRequests]);

  const onApprove = (index: number) => {
    writeContract({
      address,
      abi: CAMPAIGN_ABI,
      functionName: 'approveRequest',
      args: [BigInt(index)],
    });
  };

  const onFinalize = (index: number) => {
    writeContract({
      address,
      abi: CAMPAIGN_ABI,
      functionName: 'finalizeRequest',
      args: [BigInt(index)],
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Spending Requests</h1>
        <p className="text-muted-foreground">Found {requestsCount?.toString() || '0'} requests</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount (ETH)</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Approval Count</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">Loading requests...</TableCell>
                </TableRow>
              ) : !requestsData || requestsData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No requests found.
                  </TableCell>
                </TableRow>
              ) : (
                requestsData.map((res, index) => {
                  if (!res.result || !Array.isArray(res.result)) return null;
                  const [description, amount, recipient, complete, approvalCount] = res.result;

                  return (
                    <TableRow key={index}>
                      <TableCell>{index}</TableCell>
                      <TableCell>{description as string}</TableCell>
                      <TableCell>{formatEther(amount as bigint)}</TableCell>
                      <TableCell className="font-mono text-xs">{recipient as string}</TableCell>
                      <TableCell>
                        {approvalCount.toString()} / {approversCount?.toString() || '0'}
                      </TableCell>
                      <TableCell>
                        {complete ? (
                          <span className="text-green-600 font-medium">Completed</span>
                        ) : (
                          <span className="text-yellow-600 font-medium">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!complete && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => onApprove(index)}
                                disabled={isConfirming}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => onFinalize(index)}
                                disabled={isConfirming || Number(approvalCount) <= (Number(approversCount || 0) / 2)}
                              >
                                Finalize
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

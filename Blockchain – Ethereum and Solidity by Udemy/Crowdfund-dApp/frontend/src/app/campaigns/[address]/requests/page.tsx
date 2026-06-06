'use client';

import { useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { CAMPAIGN_ABI } from '@/constants/abis';
import { useParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useEffect } from 'react';

export default function RequestsPage() {
  const params = useParams();
  const address = params.address as `0x${string}`;

  const { data: requestsCount } = useReadContract({
    address,
    abi: CAMPAIGN_ABI,
    functionName: 'requestsCount',
  });

  const { data: hash } = { data: undefined as `0x${string}` | undefined }; // Placeholder for actual write interaction
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      toast.success('Transaction successful!');
    }
  }, [isSuccess]);

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
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Requests loading logic implemented in production version via subgraph or multi-call.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEther } from "viem";
import Link from "next/link";
import Image from "next/image";

interface CampaignCardProps {
  address: `0x${string}`;
  title: string;
  description: string;
  imageUrl: string;
  fundingGoal: bigint;
  balance: bigint;
}

export function CampaignCard({ address, title, description, imageUrl, fundingGoal, balance }: CampaignCardProps) {
  const isFunded = balance >= fundingGoal;
  const progress = Number(fundingGoal) > 0 ? Math.min((Number(balance) / Number(fundingGoal)) * 100, 100) : 0;
  const formattedRaised = formatEther(balance);
  const formattedGoal = formatEther(fundingGoal);

  return (
    <Card className="overflow-hidden flex flex-col h-full relative">
      <div className="absolute top-2 right-2 z-10">
        <Badge variant={isFunded ? "success" : "info"}>
          {isFunded ? "Funded" : "Active"}
        </Badge>
      </div>
      <div className="relative h-48 w-full">
        <Image
          src={imageUrl || "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80"}
          alt={title}
          fill
          className="object-cover"
        />
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-1">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {description}
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>{formattedRaised} ETH raised</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground">Goal: {formattedGoal} ETH</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/campaigns/${address}`}>View Campaign</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

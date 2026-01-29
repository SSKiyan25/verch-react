"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Eye, Package } from "lucide-react";

interface StockActionsProps {
  onViewHistory: () => void;
}

export function StockActions({ onViewHistory }: StockActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="outline" className="justify-start">
            <TrendingUp className="w-4 h-4 mr-2" />
            Bulk Restock
          </Button>
          <Button variant="outline" className="justify-start">
            <TrendingDown className="w-4 h-4 mr-2" />
            Mark as Sold
          </Button>
          <Button variant="outline" className="justify-start">
            <Package className="w-4 h-4 mr-2" />
            Transfer Stock
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={onViewHistory}
          >
            <Eye className="w-4 h-4 mr-2" />
            View History
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

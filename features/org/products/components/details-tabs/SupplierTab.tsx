/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { ProductWithDetails } from "@/lib/types/product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, Plus, Edit, Phone, Mail, MapPin, Building } from "lucide-react";

interface SupplierTabProps {
  product: ProductWithDetails;
}

export function SupplierTab({ product }: SupplierTabProps) {
  // TODO: Replace with actual supplier data from product
  const hasSupplier = false;
  const supplier = {
    name: "ABC Trading Co.",
    contact_person: "John Doe",
    email: "john@abctrading.com",
    phone: "+63 912 345 6789",
    address: "123 Business St, Makati City, Metro Manila",
    cost_price: 150.0,
    minimum_order: 50,
    lead_time_days: 7,
  };

  const handleSaveSupplier = () => {
    // TODO: Implement save supplier functionality
    console.log("Save supplier");
  };

  const handleRemoveSupplier = () => {
    // TODO: Implement remove supplier functionality
    console.log("Remove supplier");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Supplier Information</h3>
          <p className="text-sm text-muted-foreground">
            Manage supplier details and procurement information
          </p>
        </div>
        {hasSupplier && (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Supplier Assigned
          </Badge>
        )}
      </div>

      {hasSupplier ? (
        /* Existing Supplier */
        <div className="space-y-4">
          {/* Supplier Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                {supplier.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{supplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{supplier.email}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">{supplier.address}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      Contact Person
                    </span>
                    <div className="font-medium">{supplier.contact_person}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      Cost Price
                    </span>
                    <div className="font-medium">
                      ₱{supplier.cost_price.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      Lead Time
                    </span>
                    <div className="font-medium">
                      {supplier.lead_time_days} days
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Supplier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveSupplier}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove Supplier
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Procurement Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">
                Procurement Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-blue-800">Minimum Order</span>
                  <div className="font-medium text-blue-900">
                    {supplier.minimum_order} units
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-blue-800">Cost per Unit</span>
                  <div className="font-medium text-blue-900">
                    ₱{supplier.cost_price.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-blue-800">Lead Time</span>
                  <div className="font-medium text-blue-900">
                    {supplier.lead_time_days} days
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Add New Supplier */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Add Supplier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier-name">Supplier Name *</Label>
                <Input id="supplier-name" placeholder="ABC Trading Co." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-person">Contact Person</Label>
                <Input id="contact-person" placeholder="John Doe" />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier-email">Email</Label>
                <Input
                  id="supplier-email"
                  type="email"
                  placeholder="supplier@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-phone">Phone</Label>
                <Input id="supplier-phone" placeholder="+63 912 345 6789" />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="supplier-address">Address</Label>
              <Textarea
                id="supplier-address"
                placeholder="123 Business St, Makati City, Metro Manila"
                rows={3}
              />
            </div>

            {/* Procurement Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost-price">Cost Price (₱) *</Label>
                <Input
                  id="cost-price"
                  type="number"
                  placeholder="150.00"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimum-order">Minimum Order Qty</Label>
                <Input id="minimum-order" type="number" placeholder="50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-time">Lead Time (Days)</Label>
                <Input id="lead-time" type="number" placeholder="7" />
              </div>
            </div>

            {/* Action Button */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveSupplier}
                className="flex-1 sm:flex-initial"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Supplier
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guidelines */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-amber-900 mb-2">
            Supplier Guidelines
          </h4>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Cost price should be lower than your selling price</li>
            <li>• Lead time affects inventory planning and restocking</li>
            <li>• Keep supplier contact information up to date</li>
            <li>• Minimum order quantity helps with bulk purchasing</li>
            <li>• Regular supplier reviews improve procurement efficiency</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

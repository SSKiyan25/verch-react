"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Save, CheckCircle, FileText } from "lucide-react";

interface AddressData {
  faculty: string;
  department: string;
  building: string;
  room: string;
  campus: string;
  description: string;
}

interface AddressSectionProps {
  data: AddressData;
  onUpdate: (data: AddressData) => Promise<void>;
  isLoading?: boolean;
  isComplete?: boolean;
}

export function AddressSection({
  data,
  onUpdate,
  isLoading = false,
  isComplete = false,
}: AddressSectionProps) {
  const [formData, setFormData] = useState<AddressData>(data);
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(data);
    setIsEditing(false);
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(data);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left">
              <CardTitle className="flex items-center gap-2">
                University Location
                {isComplete && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Where students can find your organization on campus
              </p>
            </div>
          </div>
          <Badge
            variant={isComplete ? "default" : "secondary"}
            className="text-xs w-fit"
          >
            {isComplete ? "Complete" : "Incomplete"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Enter &quot;N/A&quot; for fields if not applicable.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Faculty/School */}
            <div className="space-y-2">
              <Label htmlFor="faculty" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Faculty/School *
              </Label>
              <Input
                id="faculty"
                value={formData.faculty}
                onChange={(e) =>
                  setFormData({ ...formData, faculty: e.target.value })
                }
                placeholder="e.g., Faculty of Engineering"
                disabled={!isEditing || isLoading}
                required
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                placeholder="e.g., Computer Science"
                disabled={!isEditing || isLoading}
                required
              />
            </div>

            {/* Building Name */}
            <div className="space-y-2">
              <Label htmlFor="building">Office Building *</Label>
              <Input
                id="building"
                value={formData.building}
                onChange={(e) =>
                  setFormData({ ...formData, building: e.target.value })
                }
                placeholder="e.g., Engineering Building A"
                disabled={!isEditing || isLoading}
                required
              />
            </div>

            {/* Room Number */}
            <div className="space-y-2">
              <Label htmlFor="room">Room Number</Label>
              <Input
                id="room"
                value={formData.room}
                onChange={(e) =>
                  setFormData({ ...formData, room: e.target.value })
                }
                placeholder="e.g., Room 301"
                disabled={!isEditing || isLoading}
              />
            </div>
          </div>

          {/* Campus Location */}
          <div className="space-y-2">
            <Label htmlFor="campus">Campus Location</Label>
            <Input
              id="campus"
              value={formData.campus}
              onChange={(e) =>
                setFormData({ ...formData, campus: e.target.value })
              }
              placeholder="e.g., Main Campus, Downtown Campus"
              disabled={!isEditing || isLoading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Location Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Provide additional details about how to find your organization, parking information, or any special instructions..."
              rows={3}
              disabled={!isEditing || isLoading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {!isEditing ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto"
                disabled={isLoading}
              >
                Edit Location
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="w-full sm:w-auto"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!hasChanges || isLoading}
                  className="w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? "Saving..." : "Save Location"}
                </Button>
              </>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

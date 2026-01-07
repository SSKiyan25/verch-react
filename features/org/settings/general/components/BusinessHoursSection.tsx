"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, ChevronDown, ChevronUp, Calendar } from "lucide-react";

interface BusinessHoursSectionProps {
  businessHours: Record<
    string,
    { isOpen: boolean; openTime?: string; closeTime?: string }
  >;
  onUpdate: (
    businessHours: Record<
      string,
      { isOpen: boolean; openTime?: string; closeTime?: string }
    >
  ) => Promise<void>;
  isLoading?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

export function BusinessHoursSection({
  businessHours,
  onUpdate,
  isLoading = false,
  isExpanded,
  onToggle,
}: BusinessHoursSectionProps) {
  const [localHours, setLocalHours] = useState(businessHours);

  const daysOfWeek = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ];

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    return { value: `${hour}:00`, label: `${hour}:00` };
  });

  const openDaysCount = Object.values(localHours).filter(
    (day) => day.isOpen
  ).length;

  const handleDayToggle = (day: string, isOpen: boolean) => {
    const newHours = {
      ...localHours,
      [day]: {
        isOpen,
        openTime: isOpen ? localHours[day]?.openTime || "09:00" : undefined,
        closeTime: isOpen ? localHours[day]?.closeTime || "17:00" : undefined,
      },
    };
    setLocalHours(newHours);
  };

  const handleTimeChange = (
    day: string,
    field: "openTime" | "closeTime",
    value: string
  ) => {
    const newHours = {
      ...localHours,
      [day]: {
        ...localHours[day],
        [field]: value,
      },
    };
    setLocalHours(newHours);
  };

  const handleSave = async () => {
    await onUpdate(localHours);
  };

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-center sm:text-left">
                  <CardTitle className="text-lg">Business Hours</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Set your operating schedule for customers
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">
                  {openDaysCount === 0
                    ? "Not Set"
                    : `${openDaysCount} days open`}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Days Configuration */}
            <div className="space-y-3">
              {daysOfWeek.map((day) => (
                <div
                  key={day.key}
                  className="flex flex-col gap-2 p-3 border rounded-lg sm:gap-3 sm:p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium min-w-[80px]">
                        {day.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={localHours[day.key]?.isOpen || false}
                        onCheckedChange={(checked) =>
                          handleDayToggle(day.key, checked)
                        }
                      />
                      {!localHours[day.key]?.isOpen && (
                        <span className="text-xs text-muted-foreground">
                          Click to enable
                        </span>
                      )}
                    </div>
                  </div>

                  {localHours[day.key]?.isOpen && (
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <Select
                        value={localHours[day.key]?.openTime || "09:00"}
                        onValueChange={(value) =>
                          handleTimeChange(day.key, "openTime", value)
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <span className="text-sm text-muted-foreground">to</span>

                      <Select
                        value={localHours[day.key]?.closeTime || "17:00"}
                        onValueChange={(value) =>
                          handleTimeChange(day.key, "closeTime", value)
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {!localHours[day.key]?.isOpen && (
                    <div className="text-sm text-muted-foreground text-center sm:text-left">
                      Closed
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? "Saving..." : "Save Business Hours"}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

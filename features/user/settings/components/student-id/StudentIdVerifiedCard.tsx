import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StudentIdStatusBadge } from "@/features/user/settings/components/student-id/StudentIdStatusBadge";
import type { StudentInfo } from "@/lib/supabase/queries/user-settings";

interface StudentIdVerifiedCardProps {
  studentInfo: StudentInfo;
}

export function StudentIdVerifiedCard({
  studentInfo,
}: StudentIdVerifiedCardProps) {
  const details = [
    { label: "Student ID", value: studentInfo.id_number },
    {
      label: "Name",
      value: `${studentInfo.first_name} ${studentInfo.last_name}`,
    },
    { label: "College", value: studentInfo.college },
    { label: "Department", value: studentInfo.department },
    { label: "Course", value: studentInfo.course },
    {
      label: "Year Level",
      value: studentInfo.year_level
        ? `${studentInfo.year_level}${getOrdinalSuffix(studentInfo.year_level)} Year`
        : null,
    },
    {
      label: "Verified On",
      value: studentInfo.verified_at
        ? new Date(studentInfo.verified_at).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : null,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <StudentIdStatusBadge status="verified" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {details.map(
          (item) =>
            item.value && (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ),
        )}
        <Separator />
        <p className="text-xs text-muted-foreground text-center">
          Verified by Verch
        </p>
      </CardContent>
    </Card>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

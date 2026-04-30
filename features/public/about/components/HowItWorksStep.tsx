import { type LucideIcon } from "lucide-react";

interface HowItWorksStepProps {
  icon: LucideIcon;
  step: number;
  title: string;
  description: string;
}

/**
 * Renders a single step in the "How It Works" flow on the About page.
 * Displays a step badge, icon, heading, and description.
 */
export function HowItWorksStep({
  icon: Icon,
  step,
  title,
  description,
}: HowItWorksStepProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-4">
      {/* Step badge */}
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-semibold text-lg">
        {step}
      </div>

      {/* Icon */}
      <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-muted">
        <Icon className="h-8 w-8 text-primary" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold">{title}</h3>

      {/* Description */}
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

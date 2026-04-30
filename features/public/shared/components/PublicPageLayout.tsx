import { type ReactNode } from "react";

interface PublicPageLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Layout wrapper for public static pages (About, Contact, Terms, Privacy).
 * Renders a hero header band with title/subtitle, followed by a constrained content area.
 */
export function PublicPageLayout({
  title,
  subtitle,
  children,
}: PublicPageLayoutProps) {
  return (
    <div className="w-full">
      {/* Header band */}
      <div className="w-full bg-muted border-b">
        <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          {children}
        </div>
      </div>
    </div>
  );
}

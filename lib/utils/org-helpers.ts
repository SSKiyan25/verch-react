// Helper to check if user has an organization role
export const isOrganizationUser = (userRole?: string) => {
  return [
    "organization_admin",
    "organization_manager",
    "organization_staff",
  ].includes(userRole || "");
};

// Helper to check if a URL segment looks like an ID
export const isIdSegment = (segment: string) => {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segment
    ) || // UUID
    /^\d+$/.test(segment) || // Numeric
    /^[a-zA-Z]+-\d+$/.test(segment) || // "prod-123"
    /^[a-zA-Z0-9]{8,}$/.test(segment) // Long ID
  );
};

// Pure function to generate breadcrumbs
export const generateBreadcrumbs = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);

  // Skip "org" if it's the first segment
  const startIndex = segments[0] === "org" ? 1 : 0;
  let currentPath = "/org";

  const breadcrumbs = [];

  for (let i = startIndex; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip IDs for display
    if (isIdSegment(segment)) continue;

    let href = currentPath;

    // Handle nested ID paths (link to parent)
    if (i > 0 && isIdSegment(segments[i - 1])) {
      const pathParts = currentPath.split("/").filter(Boolean);
      const cleanParts = pathParts.filter((part) => !isIdSegment(part));
      href = "/" + cleanParts.join("/");
    }

    breadcrumbs.push({
      title: segment.charAt(0).toUpperCase() + segment.slice(1),
      href,
      isLast: i === segments.length - 1,
    });
  }
  return breadcrumbs;
};

type Props = {
  totalCount: number;
  page: number;
  pageSize: number;
};

export function ProductsHeader({ totalCount, page, pageSize }: Props) {
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold tracking-tight">Products</h1>
      {totalCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {start}–{end}
          </span>{" "}
          of <span className="font-medium text-foreground">{totalCount}</span>{" "}
          products
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No products found</p>
      )}
    </div>
  );
}

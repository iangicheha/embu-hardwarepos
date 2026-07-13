export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export const getPagination = (
  page: number = 1,
  limit: number = 20
) => {
  const take = Math.min(limit, 100);
  const skip = (page - 1) * take;

  return {
    skip,
    take
  };
};

export const buildPagination = (
  page: number,
  limit: number,
  total: number
) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit)
});

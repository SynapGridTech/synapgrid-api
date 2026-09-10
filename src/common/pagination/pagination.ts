export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;

/**
 * Normalizes and validates pagination query params.
 * Throws on invalid input; callers wrap this in standard validation pipes.
 */
export function parsePagination(
  page?: number,
  limit?: number,
): { page: number; limit: number; skip: number } {
  const safePage = Math.max(1, Math.floor(page ?? 1));
  let safeLimit = Math.max(1, Math.floor(limit ?? PAGINATION_DEFAULT_LIMIT));
  if (safeLimit > PAGINATION_MAX_LIMIT) safeLimit = PAGINATION_MAX_LIMIT;

  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export interface Paginated<T> {
  items: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
  links: {
    first: string;
    previous: string | null;
    next: string | null;
    last: string;
  };
}

/**
 * Builds a stable, JSON-serializable pagination envelope with HATEOAS-style links.
 */
export function buildPaginationResponse<T>(
  items: T[],
  totalItems: number,
  page: number,
  limit: number,
  baseUrl: string,
): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  const makeLink = (targetPage: number): string => {
    const url = new URL(baseUrl, 'http://localhost');
    url.searchParams.set('page', String(targetPage));
    url.searchParams.set('limit', String(limit));
    return `${url.pathname}${url.search}`;
  };

  return {
    items,
    meta: {
      totalItems,
      itemCount: items.length,
      itemsPerPage: limit,
      totalPages,
      currentPage: page,
    },
    links: {
      first: makeLink(1),
      previous: page > 1 ? makeLink(page - 1) : null,
      next: page < totalPages ? makeLink(page + 1) : null,
      last: makeLink(totalPages),
    },
  };
}

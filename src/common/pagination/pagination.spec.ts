import {
  buildPaginationResponse,
  parsePagination,
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_MAX_LIMIT,
} from './pagination';

describe('parsePagination', () => {
  it('defaults to page 1 and the default limit', () => {
    expect(parsePagination(undefined, undefined)).toEqual({
      page: 1,
      limit: PAGINATION_DEFAULT_LIMIT,
      skip: 0,
    });
  });

  it('computes skip correctly for page 3, limit 20', () => {
    expect(parsePagination(3, 20).skip).toBe(40);
  });

  it('clamps page below 1 to 1', () => {
    expect(parsePagination(0, 10).page).toBe(1);
    expect(parsePagination(-5, 10).page).toBe(1);
  });

  it('clamps limit above max to the max limit', () => {
    expect(parsePagination(1, 10_000).limit).toBe(PAGINATION_MAX_LIMIT);
  });

  it('floors fractional input', () => {
    expect(parsePagination(2.9, 10.7).page).toBe(2);
  });
});

describe('buildPaginationResponse', () => {
  it('produces a correct envelope with meta and links', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const result = buildPaginationResponse(items, 45, 2, 20, '/api/v1/tickets');

    expect(result.items).toHaveLength(2);
    expect(result.meta).toEqual({
      totalItems: 45,
      itemCount: 2,
      itemsPerPage: 20,
      totalPages: 3,
      currentPage: 2,
    });
    expect(result.links.first).toBe('/api/v1/tickets?page=1&limit=20');
    expect(result.links.previous).toBe('/api/v1/tickets?page=1&limit=20');
    expect(result.links.next).toBe('/api/v1/tickets?page=3&limit=20');
    expect(result.links.last).toBe('/api/v1/tickets?page=3&limit=20');
  });

  it('returns null prev/next at boundaries', () => {
    const result = buildPaginationResponse([], 0, 1, 20, '/api/v1/tickets');
    expect(result.links.previous).toBeNull();
    expect(result.links.next).toBeNull();
    expect(result.meta.totalPages).toBe(1);
  });
});

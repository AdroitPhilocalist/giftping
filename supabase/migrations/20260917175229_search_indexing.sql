-- Full-text search: search_vector is kept in sync by a trigger rather than a GENERATED
-- STORED column — Postgres requires generated-column expressions to be strictly IMMUTABLE,
-- and array_to_string() (used to fold tags/occasion_tags/recipient_tags into the vector) is
-- only STABLE, so a generated column isn't an option here. A trigger has no such
-- restriction and gives the identical "always in sync, no manual maintenance" result.
-- Kept behind search_products() below so Stage 3's lib/search/index.ts can swap the
-- implementation for Algolia later without touching call sites.

alter table public.products add column search_vector tsvector;

create or replace function public.products_set_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.occasion_tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.recipient_tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.short_description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'D');
  return new;
end;
$$;

create trigger products_set_search_vector
  before insert or update on public.products
  for each row execute function public.products_set_search_vector();

create index products_search_vector_idx on public.products using gin(search_vector);

create or replace function public.search_products(search_query text)
returns setof public.products
language sql
stable
as $$
  select *
  from public.products
  where status = 'active'
    and search_vector @@ websearch_to_tsquery('english', search_query)
  order by ts_rank(search_vector, websearch_to_tsquery('english', search_query)) desc;
$$;

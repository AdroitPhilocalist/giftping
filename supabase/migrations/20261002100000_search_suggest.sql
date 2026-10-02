-- Search-as-you-type. search_products() (Stage 1) uses websearch_to_tsquery, which only matches WHOLE words
-- ("ham" finds nothing, "hamper" does) — fine for a submitted search, useless while someone is still typing.
-- This is the prefix-matching counterpart: every typed word becomes `word:*`, AND-ed together, run against the
-- same GIN-indexed search_vector, so "luxe mem" finds "Luxe Memory Hamper".
--
-- SECURITY INVOKER (the default) on purpose: the caller's own RLS still decides which products they can see
-- (active product + approved vendor), exactly as with search_products(). Returns ids only; the app joins the
-- display fields itself so ranking stays here and presentation stays in TypeScript.
--
-- The text is tokenised HERE rather than handed to to_tsquery() raw: to_tsquery raises a syntax error on stray
-- punctuation (`&`, `(`, `'`, a lone `:` ...), and a search box receives all of it. Splitting on anything that isn't a
-- letter/digit leaves only safe tokens. At most 5 words and 80 characters are considered. A query made only of stop
-- words ("for the") produces an empty tsquery and simply matches nothing.

create or replace function public.suggest_product_ids(search_text text, max_results int default 6)
returns table (id uuid)
language sql
stable
as $$
  with q as (
    select to_tsquery('english', string_agg(t || ':*', ' & ')) as tsq
    from (
      select t
      from regexp_split_to_table(lower(left(coalesce(search_text, ''), 80)), '[^[:alnum:]]+') as t
      where t <> ''
      limit 5
    ) s
  )
  select p.id
  from public.products p, q
  where p.status = 'active'
    and q.tsq is not null
    and p.search_vector @@ q.tsq
  order by ts_rank(p.search_vector, q.tsq) desc, p.review_count desc, p.name
  limit least(greatest(coalesce(max_results, 6), 1), 12);
$$;

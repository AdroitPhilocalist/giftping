-- Search improvement, three parts:
--
-- 1. SYNONYMS. search_products()/suggest_product_ids() only ever matched a word that literally appears (or shares an
--    English stem with a word that appears) in a product's name/tags/description — searching "sweets" found nothing
--    for a product tagged "chocolates", "scent" found nothing for something tagged "home fragrance". An admin-editable
--    search_synonyms table fixes this: each row is a group of words that mean the same thing for search purposes
--    (lookup is bidirectional — a row {term: "candle", synonyms: [scent, fragrance]} makes "scent" also find "candle",
--    not just the other way around). expand_search_tsquery() below does the lookup and both existing functions are
--    rewritten to call it instead of building a plain tsquery themselves; their own signatures/behaviour are otherwise
--    unchanged, so lib/search/index.ts and lib/search/suggestions.ts need no changes to keep working.
--
--    Scope deliberately kept to single words (no "gift box" -> "hamper" phrase synonyms): to_tsquery's OR-group syntax
--    (`word1 | word2`) needs each side to be one lexeme, and a phrase synonym would need the <-> phrase operator and a
--    different query shape entirely. Single words already cover the real case (mobile/phone, sweets/mithai, scent/
--    fragrance) without that complexity — revisit only if a real need for phrase synonyms actually comes up.
--
-- 2. FUZZY FALLBACK. Neither function above tolerates a typo ("hampr" matches nothing, there is no stem relating it
--    to "hamper"). search_products_fuzzy() is a trigram-similarity fallback the app calls only when the exact,
--    synonym-expanded search comes back empty. pg_trgm was already enabled (20260917175220_extensions_and_helpers.sql)
--    for "fuzzy/partial text search support" but nothing had actually used it yet.
--
-- 3. The app layer (lib/search/index.ts) decides when to call the fuzzy fallback and flags the result so the /search
--    page can tell the visitor it's showing close matches rather than silently relabelling a typo as exact.

-- ============================================================================
-- 1. search_synonyms
-- ============================================================================
-- A CHECK constraint can't contain a subquery, so validating "every element of this array matches the word
-- format" needs a helper function (a plain function call in a CHECK is fine; a SELECT/EXISTS inside one isn't).
create or replace function public.is_valid_word_array(words text[])
returns boolean
language sql
immutable
as $$
  select coalesce((select bool_and(w ~ '^[a-z0-9]{2,30}$') from unnest(words) w), false);
$$;

create table if not exists public.search_synonyms (
  id uuid primary key default gen_random_uuid(),
  term text not null unique,
  synonyms text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint search_synonyms_term_format check (term ~ '^[a-z0-9]{2,30}$'),
  constraint search_synonyms_synonyms_format check (
    -- array_length() of an empty array is NULL, not 0, and a NULL CHECK result is treated as a pass — coalesce first
    coalesce(array_length(synonyms, 1), 0) between 1 and 10
    and public.is_valid_word_array(synonyms)
  )
);

drop trigger if exists set_search_synonyms_updated_at on public.search_synonyms;
create trigger set_search_synonyms_updated_at before update on public.search_synonyms for each row execute function public.set_updated_at();

alter table public.search_synonyms enable row level security;

-- Every visitor's search goes through expand_search_tsquery() below, which reads this table — public SELECT is
-- required for an anonymous shopper's search to be able to expand at all (not just for the admin UI).
drop policy if exists search_synonyms_select_all on public.search_synonyms;
create policy search_synonyms_select_all on public.search_synonyms for select using (true);
drop policy if exists search_synonyms_admin_insert on public.search_synonyms;
create policy search_synonyms_admin_insert on public.search_synonyms for insert with check (public.is_admin());
drop policy if exists search_synonyms_admin_update on public.search_synonyms;
create policy search_synonyms_admin_update on public.search_synonyms for update using (public.is_admin());
drop policy if exists search_synonyms_admin_delete on public.search_synonyms;
create policy search_synonyms_admin_delete on public.search_synonyms for delete using (public.is_admin());

-- ============================================================================
-- 2. expand_search_tsquery() — the shared lookup, used by both search_products() and suggest_product_ids()
-- ============================================================================
create or replace function public.expand_search_tsquery(search_text text, use_prefix boolean default false)
returns tsquery
language sql
stable
as $$
  with tokens as (
    select t
    from regexp_split_to_table(lower(left(coalesce(search_text, ''), 80)), '[^[:alnum:]]+') as t
    where t <> ''
    limit 5
  ),
  expanded as (
    select tok.t as token,
      coalesce(
        (
          select array_agg(distinct w)
          from public.search_synonyms s, lateral unnest(array[s.term] || s.synonyms) as w
          where s.term = tok.t or tok.t = any (s.synonyms)
        ),
        array[]::text[]
      ) || array[tok.t] as words
    from tokens tok
  ),
  -- Each token's own OR-group must be parenthesised: tsquery's `&` binds tighter than `|` (same as boolean logic),
  -- so "a | b & c" would parse as "a | (b & c)" instead of the intended "(a | b) & c" across tokens.
  groups as (
    select '(' || string_agg(distinct w || case when use_prefix then ':*' else '' end, ' | ') || ')' as grp
    from expanded, lateral unnest(words) as w
    group by token
  )
  select to_tsquery('english', string_agg(grp, ' & '))
  from groups
  where grp is not null;
$$;

create or replace function public.search_products(search_query text)
returns setof public.products
language sql
stable
as $$
  with q as (select public.expand_search_tsquery(search_query, false) as tsq)
  select p.*
  from public.products p, q
  where p.status = 'active'
    and q.tsq is not null
    and p.search_vector @@ q.tsq
  order by ts_rank(p.search_vector, q.tsq) desc;
$$;

create or replace function public.suggest_product_ids(search_text text, max_results int default 6)
returns table (id uuid)
language sql
stable
as $$
  with q as (select public.expand_search_tsquery(search_text, true) as tsq)
  select p.id
  from public.products p, q
  where p.status = 'active'
    and q.tsq is not null
    and p.search_vector @@ q.tsq
  order by ts_rank(p.search_vector, q.tsq) desc, p.review_count desc, p.name
  limit least(greatest(coalesce(max_results, 6), 1), 12);
$$;

-- ============================================================================
-- 3. search_products_fuzzy() — typo-tolerant fallback, called only when the exact search above returns nothing
-- ============================================================================
-- pg_trgm was installed "with schema extensions" (20260917175220_extensions_and_helpers.sql). Unlike pgcrypto's
-- gen_random_uuid() elsewhere in this codebase, neither its operator class nor its functions resolve unqualified
-- here (confirmed by two failed pushes) — both need the explicit schema prefix.
create index if not exists products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);

-- word_similarity(), not plain similarity(): similarity() scores the ENTIRE name against the query, so a short
-- typo like "hampr" scores low against a long multi-word name ("Emerald & Copper Celebration Hamper") purely
-- because most of the name's trigrams have nothing to match — confirmed live, it returned zero real matches.
-- word_similarity() instead finds the best-matching CONTIGUOUS part of the name, which is what "did they mean
-- this product" actually needs. Argument order matters: word_similarity(short_query, long_name).
create or replace function public.search_products_fuzzy(search_query text, match_limit int default 24)
returns setof public.products
language sql
stable
as $$
  select *
  from public.products
  where status = 'active'
    and extensions.word_similarity(coalesce(search_query, ''), name) > 0.3
  order by extensions.word_similarity(coalesce(search_query, ''), name) desc
  limit least(greatest(coalesce(match_limit, 24), 1), 50);
$$;

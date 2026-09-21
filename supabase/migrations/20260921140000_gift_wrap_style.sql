-- Which wrapping style the customer picked for an order's gift wrap. Cosmetic only: the wrap fee stays one flat
-- per-order amount (platform_settings.gift_wrap_charge), so this never touches pricing. Null = no wrap, or an order
-- placed before styles existed. The allowed ids are pinned here so no write path can store anything else.
alter table public.orders
  add column if not exists gift_wrap_style text
  check (gift_wrap_style is null or gift_wrap_style in ('green', 'blush', 'blue', 'gold', 'ivory'));

comment on column public.orders.gift_wrap_style is 'Chosen gift-wrap colourway (green|blush|blue|gold|ivory); cosmetic, set by the server when the order is placed.';

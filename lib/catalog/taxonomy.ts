/**
 * The built-in product taxonomy a new GiftPing install starts with: broad product types (Jewellery, Cakes & Bakery...), their subcategories (up to three
 * levels), and the domain-specific attributes each one carries (Metal on Jewellery, Flavor on Chocolates...). Pure data — no database access — so it is
 * tested (taxonomy.test.ts) and shared by `npm run seed:taxonomy` (what a client runs once) and the demo seed.
 *
 * Everything here is only a STARTING POINT: the admin can rename, hide, reorder, add and remove any of it in /admin/product-types.
 *
 * Modelling rules (the test file enforces the mechanical ones):
 *  - A TYPE is a different kind of object (Necklaces vs Earrings). An ATTRIBUTE is a facet of one kind (Metal, Colour). Don't make a type out of a facet.
 *  - Attributes are inherited downwards: define one on the broadest type it is true for, and every subcategory gets it. Never redefine an inherited key.
 *  - Option text may not contain a comma (filters travel in the URL as comma-separated lists) and must stay under 60 characters; one attribute holds at most 30.
 *  - Slugs are globally unique and become URLs (/shop/jewellery/necklaces). Existing slugs (the demo catalogue uses them) must never change.
 *  - Gift cards and experience vouchers are deliberately absent: GiftPing ships physical goods, so a digital product type would have no fulfilment path.
 */
export interface AttributeDef {
  key: string;
  label: string;
  options: readonly string[];
  /** true = a product may carry several values (checkboxes); default = exactly one (dropdown) */
  multi?: boolean;
}

export interface TypeDef {
  name: string;
  slug: string;
  description?: string;
  attributes?: readonly AttributeDef[];
  children?: readonly TypeDef[];
}

const one = (key: string, label: string, options: readonly string[]): AttributeDef => ({ key, label, options });
const many = (key: string, label: string, options: readonly string[]): AttributeDef => ({ key, label, options, multi: true });
const type = (name: string, slug: string, rest: { d?: string; a?: readonly AttributeDef[]; c?: readonly TypeDef[] } = {}): TypeDef => ({
  name,
  slug,
  ...(rest.d ? { description: rest.d } : {}),
  ...(rest.a ? { attributes: rest.a } : {}),
  ...(rest.c ? { children: rest.c } : {}),
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Option lists shared by many attributes
// ---------------------------------------------------------------------------------------------------------------------------------------------
const COLOURS = ["Red", "Pink", "Orange", "Yellow", "Green", "Blue", "Navy", "Purple", "White", "Cream", "Brown", "Black", "Grey", "Gold", "Silver", "Rose Gold", "Copper", "Multicolour"] as const;
const SUITABLE_FOR = ["Women", "Men", "Unisex", "Kids"] as const;
const AGE_GROUPS = ["0–12 Months", "1–3 Years", "3–5 Years", "5–8 Years", "8–12 Years", "12+ Years", "Adults"] as const;
const APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"] as const;
const NET_WEIGHTS = ["Under 100 g", "100–250 g", "250–500 g", "500 g–1 kg", "1 kg+"] as const;
const DIETARY = ["Sugar-free", "Vegan", "Gluten-free", "Nut-free", "Organic", "Keto"] as const;

const colour = () => many("colour", "Colour", COLOURS);
const suitableFor = () => one("suitable_for", "Suitable For", SUITABLE_FOR);
const apparelSize = () => one("size", "Size", APPAREL_SIZES);
const packSize = () => one("pack_size", "Pack Size", ["Single", "Pack of 2", "Pack of 4", "Pack of 6", "Pack of 9", "Pack of 12", "Pack of 24"]);

// ---------------------------------------------------------------------------------------------------------------------------------------------
// The taxonomy. Order = display order (the first dozen top-level types are what the header's "Shop by Type" menu shows).
// ---------------------------------------------------------------------------------------------------------------------------------------------
export const TAXONOMY: readonly TypeDef[] = [
  // 1 ------------------------------------------------------------------------------------------------------------------------------------------
  type("Cakes & Bakery", "cakes-bakery", {
    d: "Fresh cakes, cupcakes, brownies and desserts from local bakeries, baked to order for the moment.",
    a: [
      one("flavor", "Flavor", ["Chocolate", "Truffle", "Vanilla", "Butterscotch", "Black Forest", "Red Velvet", "Pineapple", "Strawberry", "Mango", "Blueberry", "Coffee / Mocha", "Fresh Fruit", "Rasmalai", "Oreo", "Kit Kat", "Lotus Biscoff", "Ferrero Rocher", "Nutella", "Lemon", "Coconut", "Pistachio", "Caramel", "Mixed Flavors"]),
      one("egg_content", "Eggless or With Egg", ["Eggless", "With Egg"]),
      many("dietary", "Dietary", ["Sugar-free", "Vegan", "Gluten-free", "Keto"]),
    ],
    c: [
      type("Cakes", "cakes", {
        a: [
          one("weight", "Weight", ["250 g", "500 g", "750 g", "1 kg", "1.5 kg", "2 kg", "3 kg", "4 kg+"]),
          one("shape", "Shape", ["Round", "Square", "Heart", "Rectangle", "Number / Letter", "Custom Shape"]),
        ],
        c: [
          type("Classic Cakes", "classic-cakes"),
          type("Photo Cakes", "photo-cakes"),
          type("Designer & Theme Cakes", "designer-theme-cakes"),
          type("Multi-Tier Cakes", "multi-tier-cakes"),
          type("Cheesecakes", "cheesecakes"),
          type("Dry & Tea Cakes", "dry-tea-cakes"),
        ],
      }),
      type("Cupcakes & Muffins", "cupcakes-muffins", { a: [packSize()] }),
      type("Brownies & Cookies", "brownies-cookies", { a: [packSize()] }),
      type("Pastries & Dessert Jars", "pastries-dessert-jars", { a: [packSize()] }),
      type("Bakery Hampers & Combos", "bakery-combos"),
    ],
  }),

  // 2 ------------------------------------------------------------------------------------------------------------------------------------------
  type("Flowers & Plants", "flowers-plants", {
    d: "Fresh bouquets, preserved blooms, living plants and planters — the classic way to say it with flowers.",
    c: [
      type("Flower Bouquets", "flower-bouquets", {
        a: [
          many("flower_type", "Flower Type", ["Roses", "Carnations", "Lilies", "Orchids", "Gerberas", "Tulips", "Sunflowers", "Chrysanthemums", "Peonies", "Hydrangeas", "Daisies", "Mixed Flowers"]),
          colour(),
          one("stems", "Number of Stems", ["Under 6 Stems", "6–12 Stems", "12–24 Stems", "25–50 Stems", "50+ Stems"]),
        ],
      }),
      type("Flower Boxes & Baskets", "flower-boxes-baskets", {
        a: [many("flower_type", "Flower Type", ["Roses", "Carnations", "Lilies", "Orchids", "Gerberas", "Tulips", "Sunflowers", "Chrysanthemums", "Peonies", "Mixed Flowers"]), colour()],
      }),
      type("Preserved & Dried Flowers", "preserved-dried-flowers", { a: [colour()] }),
      type("Artificial Flowers", "artificial-flowers", { a: [colour()] }),
      type("Plants", "plants", {
        a: [
          many("placement", "Placement", ["Indoor", "Outdoor", "Living Room", "Bedroom", "Office", "Balcony", "Kitchen", "Bathroom", "Desk / Tabletop"]),
          one("light", "Light Needs", ["Low Light", "Indirect Light", "Bright Light", "Direct Sun"]),
          one("care_level", "Care Level", ["Very Easy", "Easy", "Moderate", "Expert"]),
          one("plant_size", "Plant Size", ["Small (up to 6 in)", "Medium (6–12 in)", "Large (12–24 in)", "Extra Large (24 in+)"]),
          one("pet_friendly", "Pet Friendly", ["Pet Safe", "Not Pet Safe"]),
        ],
        c: [
          type("Indoor Plants", "indoor-plants"),
          type("Flowering Plants", "flowering-plants"),
          type("Succulents & Cacti", "succulents-cacti"),
          type("Bonsai & Terrariums", "bonsai-terrariums"),
          type("Lucky & Vastu Plants", "lucky-vastu-plants"),
        ],
      }),
      type("Planters & Pots", "planters-pots", { a: [many("material", "Material", ["Ceramic", "Terracotta", "Metal", "Wooden", "Plastic", "Glass", "Concrete", "Fibre", "Cane / Wicker"]), colour()] }),
      type("Gardening Kits & Seeds", "gardening-kits-seeds"),
    ],
  }),

  // 3 ------------------------------------------------------------------------------------------------------------------------------------------
  type("Gift Hampers & Boxes", "gift-hampers-boxes", {
    d: "Ready-to-gift hampers, curated combos and beautiful boxes and wrapping to present them in.",
    a: [
      many("contains", "Contains", ["Chocolates", "Sweets", "Dry Fruits", "Cookies & Snacks", "Tea & Coffee", "Candles", "Skincare & Bath", "Home Decor", "Stationery", "Plants", "Soft Toy", "Jewellery"]),
      one("packaging", "Packaging", ["Wooden Box", "Wicker Basket", "Gift Box", "Fabric Potli", "Metal Tin", "Glass Jar", "Gift Bag"]),
    ],
    c: [
      type("Curated Hampers", "curated-hampers"),
      type("Gourmet & Snack Hampers", "gourmet-snack-hampers"),
      type("Spa & Self-care Hampers", "spa-selfcare-hampers"),
      type("Luxury Hampers", "luxury-hampers"),
      type("Festive Hampers", "festive-hampers"),
      type("Combos & Gift Sets", "combos-gift-sets"),
      type("Empty Gift Boxes", "empty-gift-boxes", {
        a: [colour(), one("box_size", "Box Size", ["Small", "Medium", "Large", "Extra Large"]), one("box_shape", "Shape", ["Square", "Rectangle", "Round", "Heart", "Hexagon"])],
      }),
      type("Gift Wrapping & Packaging", "gift-wrapping-packaging", {
        a: [one("wrap_item", "Item Type", ["Wrapping Paper", "Gift Bags", "Ribbons & Bows", "Gift Tags & Cards", "Tissue & Fillers", "Wrapping Kits"]), colour()],
      }),
    ],
  }),

  // 4 ------------------------------------------------------------------------------------------------------------------------------------------
  type("Chocolates & Sweets", "chocolates-sweets", {
    d: "Handmade chocolates, truffles, mithai and festive sweets from boutique confectioners.",
    a: [
      one("flavor", "Flavor", ["Dark Chocolate", "Milk Chocolate", "White Chocolate", "Assorted", "Mithai", "Caramel", "Salted Caramel", "Hazelnut", "Almond", "Orange", "Mint", "Coffee", "Berry", "Rose & Pistachio", "Fruit & Nut"]),
      many("dietary", "Dietary", DIETARY),
      one("net_weight", "Net Weight", NET_WEIGHTS),
    ],
    c: [
      type("Chocolate Gift Boxes", "chocolate-gift-boxes"),
      type("Handmade & Artisan Chocolates", "artisan-chocolates"),
      type("Chocolate Bars & Slabs", "chocolate-bars"),
      type("Chocolate Bouquets", "chocolate-bouquets"),
      type("Indian Sweets & Mithai", "indian-mithai", {
        a: [many("mithai_type", "Sweet Type", ["Barfi", "Laddoo", "Peda", "Halwa", "Rasgulla", "Rasmalai", "Kaju Katli", "Gulab Jamun", "Soan Papdi", "Jalebi", "Bengali Sweets", "Assorted Mithai"])],
      }),
      type("Macarons & Cookies", "macarons-cookies"),
      type("Candies & Toffees", "candies-toffees"),
    ],
  }),

  // 5 ------------------------------------------------------------------------------------------------------------------------------------------
  type("Personalized Gifts", "personalized-gifts", {
    d: "Gifts made one-of-a-kind with a name, a photo or a message — engraved, printed and made to order.",
    a: [
      many("personalization_type", "Personalisation Type", ["Photo Print", "Name Engraving", "Text Message", "Monogram / Initials", "Caricature / Illustration", "Date / Anniversary", "Custom Logo", "QR Code / Song"]),
      one("dispatch_time", "Dispatch Time", ["1–2 Days", "3–5 Days", "5–7 Days", "7–10 Days", "10+ Days"]),
    ],
    c: [
      type("Photo Frames & Collages", "photo-frames", {
        a: [
          one("frame_material", "Frame Material", ["Wooden", "Metal", "Acrylic", "Glass", "Canvas", "MDF"]),
          one("frame_size", "Frame Size", ["4x6 in", "5x7 in", "8x10 in", "10x12 in", "12x18 in", "A4", "A3", "Collage / Multi-photo"]),
        ],
      }),
      type("Mugs & Drinkware", "mugs-drinkware", {
        a: [
          one("drinkware_item", "Item", ["Ceramic Mug", "Magic Mug", "Travel Tumbler", "Sipper Bottle", "Beer Mug", "Wine Glass", "Coffee Set"]),
          one("capacity", "Capacity", ["250 ml", "300 ml", "350 ml", "500 ml", "750 ml", "1 L"]),
        ],
      }),
      type("Cushions & Blankets", "cushions-blankets", { a: [colour()] }),
      type("Photo Lamps & Lights", "photo-lamps", { a: [one("lamp_type", "Lamp Type", ["LED Photo Lamp", "Moon Lamp", "Lithophane", "Neon Sign", "Night Lamp"])] }),
      type("Name Plates & Signs", "name-plates-signs", { a: [one("sign_material", "Material", ["Wood", "Acrylic", "Metal", "Marble", "Ceramic", "Glass"])] }),
      type("Keychains & Charms", "keychains-charms"),
      type("Photo Albums & Scrapbooks", "albums-scrapbooks"),
      type("Personalised Stationery", "personalized-stationery"),
      type("Engraved & Wooden Keepsakes", "engraved-wooden-keepsakes"),
      type("Phone Cases & Tech", "phone-cases-tech"),
      type("Personalised Apparel", "personalized-apparel", { a: [apparelSize(), colour(), one("apparel_item", "Item", ["T-shirt", "Hoodie", "Sweatshirt", "Cap", "Tote Bag", "Apron", "Socks"])] }),
      type("Calendars, Posters & Wall Art", "calendars-posters-art"),
      type("Portraits & Caricatures", "portraits-caricatures"),
    ],
  }),

  // 6 ------------------------------------------------------------------------------------------------------------------------------------------
  type("Jewellery", "jewellery", {
    d: "Necklaces, earrings, bangles, rings and sets — from everyday elegance to bridal statement pieces.",
    a: [
      one("metal", "Metal", ["Gold", "Gold-plated", "Rose Gold-plated", "Silver", "Sterling Silver (925)", "Oxidised Silver", "Platinum", "Brass", "Kundan", "Copper", "Stainless Steel", "Alloy"]),
      many("stone", "Stone / Gemstone", ["Diamond", "American Diamond (CZ)", "Pearl", "Ruby", "Emerald", "Sapphire", "Amethyst", "Topaz", "Polki", "Semi-precious", "Crystal", "No Stone"]),
      many("jewellery_style", "Style", ["Traditional", "Contemporary", "Minimalist", "Bridal", "Statement", "Antique", "Temple", "Boho", "Party Wear", "Daily Wear"]),
      suitableFor(),
    ],
    c: [
      type("Necklaces", "necklaces", { a: [one("necklace_type", "Necklace Type", ["Chain", "Choker", "Princess", "Rani Haar", "Layered", "Pendant Necklace", "Name Necklace", "Collar", "Statement", "Beaded"])] }),
      type("Earrings", "earrings", { a: [one("earring_type", "Earring Type", ["Studs", "Jhumkas", "Drops & Danglers", "Hoops", "Chandbalis", "Ear Cuffs", "Clip-ons", "Sui Dhaga"])] }),
      type("Bangles & Bracelets", "bangles-bracelets", {
        a: [
          one("bangle_type", "Type", ["Bangles Set", "Kada", "Bracelet", "Cuff", "Charm Bracelet", "Chain Bracelet", "Friendship Band"]),
          one("bangle_size", "Size", ["2.2 in", "2.4 in", "2.6 in", "2.8 in", "Adjustable", "Free Size"]),
        ],
      }),
      type("Pendants", "pendants", { a: [one("pendant_style", "Pendant Style", ["Initial / Letter", "Name", "Heart", "Zodiac", "Religious", "Evil Eye", "Solitaire", "Locket", "Charm"])] }),
      type("Rings", "rings", {
        a: [
          one("ring_type", "Ring Type", ["Solitaire", "Band", "Cocktail", "Couple Rings", "Adjustable", "Signet", "Engagement"]),
          one("ring_size", "Ring Size", ["6", "7", "8", "9", "10", "11", "12", "Adjustable"]),
        ],
      }),
      type("Jewellery Sets", "jewellery-sets"),
      type("Mangalsutra & Bridal Jewellery", "mangalsutra-bridal"),
      type("Anklets & Toe Rings", "anklets-toe-rings"),
      type("Maang Tikka & Hair Jewellery", "hair-jewellery"),
    ],
  }),

  // 7 ------------------------------------------------------------------------------------------------------------------------------------------
  type("Home & Living", "home-living", {
    d: "Home decor, kitchen and dining, soft furnishings and lighting — gifts that make a house feel like home.",
    a: [
      many("material", "Material", ["Wood", "Metal", "Brass", "Ceramic", "Glass", "Cotton", "Linen", "Velvet", "Resin", "Marble", "Bamboo", "Jute", "Acrylic", "Terracotta", "Cane / Wicker"]),
      colour(),
      many("home_style", "Style", ["Modern", "Traditional", "Rustic", "Bohemian", "Minimalist", "Scandinavian", "Vintage", "Luxe"]),
      many("room", "Best For Room", ["Living Room", "Bedroom", "Kitchen", "Dining", "Bathroom", "Study / Office", "Balcony / Garden", "Kids Room", "Pooja Room"]),
    ],
    c: [
      type("Home Decor", "home-decor", {
        c: [
          type("Wall Art & Frames", "wall-art-frames"),
          type("Showpieces & Figurines", "showpieces-figurines"),
          type("Vases & Table Decor", "vases-table-decor"),
          type("Wall & Table Clocks", "clocks"),
          type("Mirrors", "mirrors"),
          type("Trays & Decorative Platters", "decorative-trays"),
        ],
      }),
      type("Kitchen & Dining", "kitchen-dining", {
        c: [
          type("Tea & Coffee Sets", "tea-coffee-sets"),
          type("Drinkware", "drinkware", { a: [one("drinkware_type", "Drinkware Type", ["Mugs", "Cups & Saucers", "Glasses", "Water Bottles", "Flasks", "Tumblers"])] }),
          type("Serveware & Platters", "serveware-platters"),
          type("Barware & Decanters", "barware-decanters"),
          type("Jars & Containers", "jars-containers"),
          type("Dinner Sets & Cutlery", "dinner-sets-cutlery"),
        ],
      }),
      type("Furnishing & Textiles", "furnishing-textiles", {
        c: [
          type("Cushions & Covers", "cushions-covers"),
          type("Throws & Blankets", "throws-blankets"),
          type("Bed Linen", "bed-linen"),
          type("Table Runners & Mats", "table-linen"),
          type("Rugs & Doormats", "rugs-doormats"),
        ],
      }),
      type("Lighting", "lighting", {
        a: [one("power_source", "Power Source", ["Battery", "USB", "Plug-in", "Solar", "Candle / Flame"])],
        c: [
          type("Table Lamps", "table-lamps"),
          type("Fairy & String Lights", "fairy-string-lights"),
          type("Lanterns & Candle Holders", "lanterns-candle-holders"),
          type("Night Lamps", "night-lamps"),
        ],
      }),
      type("Organisers & Storage", "organisers-storage", {
        c: [type("Jewellery Boxes", "jewellery-boxes"), type("Storage Baskets & Boxes", "storage-baskets"), type("Keepsake Boxes", "keepsake-boxes")],
      }),
    ],
  }),

  // 8 ------------------------------------------------------------------------------------------------------------------------------------------
  type("Candles & Home Fragrance", "candles-home-fragrance", {
    d: "Scented candles, diffusers, incense and room fragrance to turn any room into a retreat.",
    a: [
      one("scent", "Scent", ["Amber & Cedar", "Jasmine & Sandal", "Fig & Vanilla", "Unscented", "Lavender", "Rose", "Sandalwood", "Vanilla", "Lemongrass", "Eucalyptus & Mint", "Citrus", "Ocean Breeze", "Coffee", "Cinnamon & Spice", "Sea Salt & Driftwood", "Oud", "Lotus", "Tuberose", "Pine & Cedar", "Coconut"]),
    ],
    c: [
      type("Scented Candles", "scented-candles", {
        a: [
          one("wax_type", "Wax Type", ["Soy Wax", "Beeswax", "Paraffin", "Palm Wax", "Gel Wax"]),
          one("burn_time", "Burn Time", ["Up to 20 Hrs", "20–40 Hrs", "40–60 Hrs", "60+ Hrs"]),
          one("vessel", "Vessel", ["Glass Jar", "Tin", "Ceramic", "Wooden", "Concrete", "Brass"]),
        ],
      }),
      type("Pillar & Decorative Candles", "decorative-candles", { a: [one("wax_type", "Wax Type", ["Soy Wax", "Beeswax", "Paraffin", "Palm Wax", "Gel Wax"]), colour()] }),
      type("Tea Lights & Floating Candles", "floating-tealights"),
      type("Candle Gift Sets", "candle-sets"),
      type("Reed Diffusers", "reed-diffusers"),
      type("Aroma Diffusers & Oil Burners", "aroma-diffusers-burners"),
      type("Incense, Dhoop & Cones", "incense-dhoop"),
      type("Room Sprays & Mists", "room-sprays"),
      type("Essential & Aroma Oils", "essential-aroma-oils"),
      type("Potpourri & Scent Sachets", "potpourri-sachets"),
    ],
  }),

  // 9 ------------------------------------------------------------------------------------------------------------------------------------------
  type("Beauty & Wellness", "beauty-wellness", {
    d: "Skincare, fragrance, bath and body, grooming and spa gifts — self-care, wrapped up.",
    a: [
      suitableFor(),
      many("claims", "Claims", ["Vegan", "Cruelty-free", "Organic", "Ayurvedic", "Paraben-free", "Sulphate-free", "Dermatologist Tested"]),
    ],
    c: [
      type("Skincare", "skincare", {
        a: [many("skin_type", "Skin Type", ["All Skin Types", "Oily", "Dry", "Combination", "Sensitive", "Normal", "Acne-prone", "Mature"])],
        c: [type("Face Care", "face-care"), type("Body Lotions & Butters", "body-care"), type("Lip Care", "lip-care"), type("Skincare Gift Sets", "skincare-gift-sets")],
      }),
      type("Makeup", "makeup", { c: [type("Lips", "makeup-lips"), type("Eyes", "makeup-eyes"), type("Face", "makeup-face"), type("Nails", "makeup-nails"), type("Makeup Kits & Palettes", "makeup-kits")] }),
      type("Fragrances", "fragrances", {
        a: [
          many("fragrance_family", "Fragrance Family", ["Floral", "Woody", "Citrus", "Oriental / Amber", "Fresh / Aquatic", "Musky", "Fruity", "Spicy", "Gourmand"]),
          one("fragrance_volume", "Volume", ["10 ml", "30 ml", "50 ml", "100 ml", "200 ml"]),
        ],
        c: [type("Perfumes & Eau de Parfum", "perfumes"), type("Attars & Itar", "attars"), type("Body Mists & Deodorants", "body-mists-deodorants"), type("Fragrance Gift Sets", "fragrance-gift-sets")],
      }),
      type("Bath & Body", "bath-body", { a: [one("bath_item", "Item", ["Soaps", "Body Wash", "Scrubs", "Bath Salts & Bombs", "Hand Cream", "Body Oil", "Loofah & Accessories"])] }),
      type("Hair Care", "hair-care"),
      type("Men's Grooming", "mens-grooming", { a: [one("grooming_item", "Item", ["Beard Care", "Shaving Kits", "Grooming Kits", "Aftershave & Cologne", "Trimmers"])] }),
      type("Spa & Self-care Kits", "spa-selfcare-kits"),
    ],
  }),

  // 10 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Fashion & Apparel", "fashion-apparel", {
    d: "Sarees, kurtas, western wear, loungewear and shawls — gifts to wear and wear again.",
    a: [
      colour(),
      many("fabric", "Fabric", ["Cotton", "Silk", "Linen", "Georgette", "Chiffon", "Satin", "Velvet", "Wool", "Denim", "Polyester", "Rayon", "Khadi", "Chanderi", "Banarasi", "Kanjeevaram", "Net"]),
    ],
    c: [
      type("Women's Wear", "womens-wear", {
        c: [
          type("Sarees", "sarees", { a: [one("saree_type", "Saree Type", ["Banarasi", "Kanjeevaram", "Paithani", "Bandhani", "Chanderi", "Maheshwari", "Patola", "Tussar", "Ikat", "Printed / Casual", "Designer / Party"])] }),
          type("Kurtas & Suits", "kurtas-suits", { a: [apparelSize(), one("kurta_set", "Set Type", ["Kurta Only", "Kurta with Bottom", "Kurta Set with Dupatta", "Anarkali", "Co-ord Set"])] }),
          type("Western Wear", "western-wear", { a: [apparelSize(), one("western_item", "Item", ["Tops", "Dresses", "Jumpsuits", "Skirts", "Jackets", "Sweaters"])] }),
          type("Dupattas", "dupattas"),
        ],
      }),
      type("Men's Wear", "mens-wear", {
        c: [type("Kurtas & Ethnic Wear", "mens-ethnic-wear", { a: [apparelSize()] }), type("Shirts & T-shirts", "shirts-tshirts", { a: [apparelSize()] })],
      }),
      type("Loungewear & Sleepwear", "loungewear-sleepwear", { a: [apparelSize(), suitableFor()] }),
      type("Shawls, Scarves & Stoles", "shawls-scarves-stoles"),
      type("Socks & Innerwear", "socks-innerwear", { a: [apparelSize(), suitableFor()] }),
      type("Couple & Family Matching Outfits", "matching-outfits", { a: [apparelSize()] }),
    ],
  }),

  // 11 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Gourmet & Dry Fruits", "gourmet-dry-fruits", {
    d: "Dry fruits, teas and coffees, honey and preserves, snacks and superfoods — gourmet gifts to share.",
    a: [many("dietary", "Dietary", ["Vegan", "Gluten-free", "Sugar-free", "Organic", "Keto", "Low Calorie", "No Preservatives"]), one("net_weight", "Net Weight", NET_WEIGHTS)],
    c: [
      type("Dry Fruits & Nuts", "dry-fruits-nuts", {
        a: [
          many("fruit_type", "Dry Fruit Type", ["Almonds", "Cashews", "Pistachios", "Walnuts", "Raisins", "Dates", "Figs", "Apricots", "Cranberries", "Mixed Dry Fruits", "Makhana", "Seeds"]),
          one("nut_style", "Style", ["Plain", "Roasted", "Salted", "Flavoured", "Chocolate Coated"]),
        ],
      }),
      type("Tea & Coffee", "tea-coffee", {
        c: [
          type("Teas", "teas", { a: [many("tea_type", "Tea Type", ["Green Tea", "Black Tea", "Masala Chai", "Herbal Tisane", "Oolong", "White Tea", "Matcha", "Chamomile", "Darjeeling", "Assam", "Kashmiri Kahwa"])] }),
          type("Coffees", "coffees", { a: [one("coffee_type", "Coffee Type", ["Instant", "Ground", "Whole Beans", "Cold Brew", "Drip Bags"])] }),
        ],
      }),
      type("Honey, Jams & Spreads", "honey-jams-spreads"),
      type("Snacks & Savouries", "snacks-savouries"),
      type("Health Foods & Superfoods", "health-superfoods"),
      type("Pickles, Sauces & Condiments", "pickles-sauces-condiments"),
      type("Beverages & Mixes", "beverages-mixes"),
    ],
  }),

  // 12 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Toys & Games", "toys-games", {
    d: "Soft toys, learning toys, board games and collectibles for every age and every kind of play.",
    a: [many("age_group", "Age Group", AGE_GROUPS)],
    c: [
      type("Soft Toys & Plush", "soft-toys-plush", {
        a: [
          one("toy_size", "Toy Size", ["Small (up to 30 cm)", "Medium (30–60 cm)", "Large (60–100 cm)", "Giant (100 cm+)"]),
          one("plush_character", "Character", ["Teddy Bear", "Panda", "Unicorn", "Dinosaur", "Bunny", "Cartoon Character", "Other"]),
          colour(),
        ],
      }),
      type("Educational & STEM Toys", "educational-stem-toys"),
      type("Building Blocks & Construction", "building-blocks"),
      type("Board Games & Puzzles", "board-games-puzzles", { a: [one("players", "Players", ["1 Player", "2 Players", "2–4 Players", "4+ Players"])] }),
      type("Action Figures & Collectibles", "action-figures-collectibles"),
      type("Remote Control & Vehicles", "remote-control-vehicles"),
      type("Dolls & Playsets", "dolls-playsets"),
      type("Kids' Art & Craft Kits", "kids-craft-kits"),
      type("Outdoor & Sports Toys", "outdoor-sports-toys"),
      type("Card & Party Games", "card-party-games"),
    ],
  }),

  // 13 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Electronics & Gadgets", "electronics-gadgets", {
    d: "Headphones, speakers, smartwatches, power banks and clever gadgets for the tech lover.",
    a: [colour(), one("warranty", "Warranty", ["No Warranty", "6 Months", "1 Year", "2 Years", "3 Years+"])],
    c: [
      type("Audio", "audio", {
        c: [
          type("Headphones & Earbuds", "headphones-earbuds", {
            a: [
              one("headphone_type", "Headphone Type", ["Over-ear", "On-ear", "In-ear", "True Wireless", "Neckband"]),
              one("connectivity", "Connectivity", ["Bluetooth", "Wired", "Wireless 2.4 GHz", "USB-C"]),
            ],
          }),
          type("Bluetooth Speakers", "bluetooth-speakers", { a: [one("speaker_use", "Best For", ["Portable", "Home", "Party", "Waterproof"])] }),
        ],
      }),
      type("Smartwatches & Fitness Bands", "wearables"),
      type("Power Banks & Chargers", "power-banks-chargers", { a: [one("power_capacity", "Capacity", ["Up to 5000 mAh", "10000 mAh", "20000 mAh", "30000 mAh+", "Not Applicable"])] }),
      type("Mobile & Tablet Accessories", "mobile-tablet-accessories"),
      type("Cameras & Photography", "cameras-photography"),
      type("Smart Home & Lighting", "smart-home"),
      type("Computer & Desk Gadgets", "computer-gadgets"),
      type("Gaming Accessories", "gaming-accessories"),
      type("Novelty & Mini Gadgets", "novelty-gadgets"),
    ],
  }),

  // 14 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Watches & Accessories", "watches-accessories", {
    d: "Watches, sunglasses, belts, cufflinks and hair accessories — the finishing touches.",
    a: [suitableFor(), colour(), many("material", "Material", ["Leather", "Stainless Steel", "Metal", "Silicone", "Fabric", "Wood", "Acetate", "Brass", "Plastic"])],
    c: [
      type("Watches", "watches", {
        a: [
          one("watch_type", "Watch Type", ["Analog", "Digital", "Smart", "Automatic", "Chronograph"]),
          one("strap_type", "Strap", ["Leather", "Metal", "Silicone", "Fabric", "Mesh"]),
        ],
      }),
      type("Sunglasses & Eyewear", "sunglasses-eyewear"),
      type("Belts", "belts"),
      type("Cufflinks, Ties & Pocket Squares", "cufflinks-ties"),
      type("Hair Accessories", "hair-accessories"),
      type("Caps & Hats", "caps-hats"),
    ],
  }),

  // 15 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Bags & Wallets", "bags-wallets", {
    d: "Wallets, handbags, clutches, backpacks and travel bags in leather, canvas and fabric.",
    a: [
      many("bag_material", "Material", ["Genuine Leather", "Vegan Leather", "Canvas", "Nylon", "Jute", "Cotton", "Silk / Brocade", "Polyester", "Denim"]),
      colour(),
      suitableFor(),
    ],
    c: [
      type("Wallets", "wallets", { a: [one("wallet_type", "Wallet Type", ["Bi-fold", "Tri-fold", "Card Holder", "Money Clip", "Zip-around", "Passport Holder"])] }),
      type("Handbags & Totes", "handbags-totes"),
      type("Clutches & Potlis", "clutches-potlis"),
      type("Backpacks & Laptop Bags", "backpacks-laptop-bags"),
      type("Travel & Duffle Bags", "travel-duffle-bags"),
      type("Sling & Cross-body Bags", "sling-crossbody-bags"),
      type("Pouches & Organisers", "pouches-organisers"),
    ],
  }),

  // 16 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Leather & Stationery", "leather-stationery", {
    d: "Diaries, journals, pens, desk accessories and fine leather goods for the writer and the planner.",
    a: [one("stationery_material", "Material", ["Genuine Leather", "Vegan Leather", "Paper", "Wood", "Metal", "Cork", "Fabric"]), colour()],
    c: [
      type("Diaries & Journals", "diaries-journals", {
        a: [
          one("ruling", "Page Style", ["Ruled", "Blank", "Dotted", "Grid", "Mixed"]),
          one("book_size", "Size", ["Pocket", "A6", "A5", "B5", "A4"]),
          one("binding", "Binding", ["Hardbound", "Softbound", "Spiral", "Refillable / Ring-bound", "Stitched"]),
        ],
      }),
      type("Notebooks & Planners", "notebooks-planners", { a: [one("book_size", "Size", ["Pocket", "A6", "A5", "B5", "A4"]), one("ruling", "Page Style", ["Ruled", "Blank", "Dotted", "Grid", "Mixed"])] }),
      type("Pens & Writing Instruments", "pens-writing", { a: [one("pen_type", "Pen Type", ["Fountain Pen", "Ball Pen", "Roller Ball", "Gel Pen", "Pen Set", "Calligraphy", "Pencils & Markers"])] }),
      type("Desk Accessories & Organisers", "desk-accessories"),
      type("Leather Accessories", "leather-accessories"),
      type("Stationery Gift Sets", "stationery-gift-sets"),
      type("Desk Calendars", "desk-calendars"),
    ],
  }),

  // 17 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Wedding & Festive", "wedding-festive", {
    d: "Wedding favours, trousseau packing, rakhis, festive decor and everything for the big celebrations.",
    a: [
      many("festival", "Festival", ["Diwali", "Rakhi", "Holi", "Eid", "Christmas", "Karwa Chauth", "Navratri / Durga Puja", "Ganesh Chaturthi", "Pongal / Sankranti", "Onam", "Lohri", "New Year", "Baisakhi"]),
      colour(),
    ],
    c: [
      type("Wedding Favours & Return Gifts", "wedding-favours"),
      type("Trousseau & Wedding Packing", "trousseau-packing"),
      type("Bridal & Groom Accessories", "bridal-groom-accessories"),
      type("Wedding Invitations & Cards", "wedding-invitations"),
      type("Haldi & Mehendi Essentials", "haldi-mehendi-essentials"),
      type("Rakhis", "rakhis", { a: [one("rakhi_type", "Rakhi Type", ["Single Rakhi", "Rakhi Set", "Lumba", "Kids Rakhi", "Bracelet Rakhi", "Designer Rakhi", "Eco-friendly Rakhi"])] }),
      type("Diyas & Festive Lighting", "diyas-festive-lighting"),
      type("Torans, Rangoli & Festive Decor", "torans-rangoli-decor"),
      type("Christmas Trees & Decor", "christmas-decor"),
    ],
  }),

  // 18 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Pooja & Spiritual", "pooja-spiritual", {
    d: "Idols, pooja thalis, diyas, home temples and spiritual gifts in brass, silver and stone.",
    a: [many("pooja_material", "Material", ["Brass", "Copper", "Silver", "Silver-plated", "Gold-plated", "Wood", "Stone / Marble", "Ceramic", "Resin", "Panchdhatu"])],
    c: [
      type("Idols & Statues", "idols-statues", {
        a: [
          many("deity", "Deity", ["Ganesha", "Lakshmi", "Shiva", "Krishna", "Radha-Krishna", "Hanuman", "Durga", "Vishnu", "Saraswati", "Ram Darbar", "Buddha", "Sai Baba", "Balaji", "Others"]),
          one("idol_height", "Height", ["Under 4 in", "4–8 in", "8–12 in", "12–24 in", "24 in+"]),
        ],
      }),
      type("Pooja Thalis & Essentials", "pooja-thalis-essentials"),
      type("Diyas & Lamps", "diyas-lamps"),
      type("Home Temples & Mandirs", "home-temples"),
      type("Rudraksha, Malas & Spiritual Jewellery", "rudraksha-malas"),
      type("Yoga & Meditation", "yoga-meditation"),
      type("Havan & Pooja Samagri", "havan-samagri"),
      type("Religious Books & Frames", "religious-books-frames"),
    ],
  }),

  // 19 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Kids & Baby", "baby-kids", {
    d: "Baby gift sets, keepsakes, nursery decor and gifts for kids — for the smallest celebrations.",
    a: [many("kids_age", "Age Group", ["Newborn", "0–6 Months", "6–12 Months", "1–3 Years", "3–5 Years", "5–8 Years", "8–12 Years"]), one("kids_gender", "For", ["Boy", "Girl", "Unisex"])],
    c: [
      type("Baby Gift Sets & Hampers", "baby-gift-sets"),
      type("Baby Clothing", "baby-clothing", { a: [one("baby_size", "Size", ["Newborn", "0–3 Months", "3–6 Months", "6–12 Months", "12–18 Months", "18–24 Months"])] }),
      type("Kids Clothing", "kids-clothing", { a: [one("kids_size", "Size", ["2–3 Years", "3–4 Years", "4–5 Years", "5–6 Years", "6–8 Years", "8–10 Years", "10–12 Years"])] }),
      type("Nursery & Room Decor", "nursery-decor"),
      type("Baby Keepsakes & Milestones", "baby-keepsakes"),
      type("Baby Care & Feeding", "baby-care-feeding"),
      type("Kids Books & Stationery", "kids-books-stationery"),
      type("School & Lunch Bags", "school-lunch-bags"),
      type("Maternity & New Mom Gifts", "maternity-new-mom"),
    ],
  }),

  // 20 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Party & Celebration", "party-celebration", {
    d: "Balloons, decoration kits, banners, props and surprise boxes to make any celebration feel special.",
    a: [
      many("party_theme", "Theme", ["Birthday", "Anniversary", "Baby Shower", "Bridal Shower", "Wedding", "Graduation", "Retirement", "Housewarming", "Valentine's Day", "Christmas", "New Year", "Kids Party"]),
      colour(),
    ],
    c: [
      type("Balloon Bouquets & Arches", "balloons", { a: [one("balloon_type", "Balloon Type", ["Foil", "Latex", "Number / Letter", "Helium", "Confetti", "Chrome"])] }),
      type("Party Decoration Kits", "party-decoration-kits"),
      type("Banners & Backdrops", "banners-backdrops"),
      type("Party Props & Favours", "party-props-favours"),
      type("Cake Toppers & Party Candles", "cake-toppers-candles"),
      type("Party Tableware", "party-tableware"),
      type("Surprise & Reveal Boxes", "surprise-boxes"),
      type("Romantic & Proposal Decor", "romantic-decor"),
    ],
  }),

  // 21 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Corporate & Branded Gifts", "corporate-branded-gifts", {
    d: "Executive gift sets, welcome kits, awards and branded merchandise — ready for bulk and for branding.",
    a: [
      one("min_order", "Minimum Order", ["No Minimum", "10+ Units", "25+ Units", "50+ Units", "100+ Units", "500+ Units"]),
      many("branding", "Branding Options", ["Logo Printing", "Logo Engraving", "Embroidery", "Laser Etching", "Custom Packaging", "No Branding"]),
    ],
    c: [
      type("Executive Gift Sets", "executive-gift-sets"),
      type("Desk & Office Accessories", "desk-office-accessories"),
      type("Welcome & Onboarding Kits", "welcome-onboarding-kits"),
      type("Awards, Trophies & Plaques", "awards-trophies"),
      type("Branded Apparel & Merchandise", "branded-merchandise"),
      type("Corporate Hampers & Festive Boxes", "corporate-hampers"),
      type("Conference & Event Kits", "conference-kits"),
      type("Branded Drinkware & Bottles", "branded-drinkware"),
      type("Eco-friendly Corporate Gifts", "eco-corporate-gifts"),
    ],
  }),

  // 22 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Handicrafts & Artisanal", "handicrafts-artisanal", {
    d: "Handmade crafts from India's artisans — brassware, pottery, handloom, folk paintings and more.",
    a: [
      one("origin_state", "Craft Origin", ["Rajasthan", "Gujarat", "Uttar Pradesh", "Bihar", "West Bengal", "Odisha", "Tamil Nadu", "Karnataka", "Kerala", "Kashmir", "Maharashtra", "Andhra Pradesh / Telangana", "Madhya Pradesh", "North-East India", "Punjab", "Other"]),
      many("craft_material", "Material", ["Brass", "Wood", "Terracotta", "Clay / Pottery", "Marble", "Bamboo / Cane", "Jute", "Handloom Cotton", "Silk", "Stone", "Leather", "Dhokra Metal", "Paper Mache"]),
    ],
    c: [
      type("Brassware & Metal Crafts", "brassware-metal-crafts"),
      type("Wooden Handicrafts", "wooden-handicrafts"),
      type("Pottery & Terracotta", "pottery-terracotta"),
      type("Handloom & Textile Crafts", "handloom-textile-crafts"),
      type("Folk Art Paintings", "folk-art-paintings", { a: [one("art_form", "Art Form", ["Madhubani", "Warli", "Tanjore", "Pattachitra", "Gond", "Kalamkari", "Pichwai", "Miniature", "Phad"])] }),
      type("Stone & Marble Crafts", "stone-marble-crafts"),
      type("Bamboo & Cane Crafts", "bamboo-cane-crafts"),
    ],
  }),

  // 23 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Books, Art & Hobbies", "books-art-hobbies", {
    d: "Books, art supplies, DIY kits and musical instruments for the curious and the creative.",
    c: [
      type("Books", "books", {
        a: [
          many("genre", "Genre", ["Fiction", "Non-fiction", "Self-help", "Biography", "Poetry", "Comics & Graphic Novels", "Spirituality", "Cookbooks", "Children's", "Business", "Art & Photography", "Travel"]),
          one("book_format", "Format", ["Paperback", "Hardcover", "Box Set", "Collector's Edition"]),
        ],
      }),
      type("Art & Craft Supplies", "art-craft-supplies"),
      type("DIY & Hobby Kits", "diy-hobby-kits", {
        a: [one("hobby", "Hobby", ["Painting", "Embroidery", "Knitting / Crochet", "Candle Making", "Pottery", "Model Building", "Jewellery Making", "Calligraphy", "Origami", "Resin Art"])],
      }),
      type("Musical Instruments", "musical-instruments", { a: [one("instrument", "Instrument", ["Ukulele", "Guitar", "Keyboard", "Flute", "Harmonica", "Drums / Percussion", "Violin"])] }),
    ],
  }),

  // 24 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Fitness & Travel", "fitness-travel", {
    d: "Bottles, yoga and fitness gear, travel accessories and outdoor kit for the active and the adventurous.",
    a: [colour(), suitableFor()],
    c: [
      type("Water Bottles & Flasks", "water-bottles-flasks", { a: [one("bottle_capacity", "Capacity", ["500 ml", "750 ml", "1 L", "1.5 L", "2 L+"])] }),
      type("Yoga & Fitness Gear", "yoga-fitness"),
      type("Travel Accessories", "travel-accessories"),
      type("Outdoor & Adventure Gear", "outdoor-adventure"),
      type("Massagers & Health Gadgets", "massagers-health"),
      type("Sports Gear & Accessories", "sports-accessories"),
    ],
  }),

  // 25 -----------------------------------------------------------------------------------------------------------------------------------------
  type("Pet Gifts", "pet-gifts", {
    d: "Treats, toys, beds and personalised gifts for the four-legged family members and their humans.",
    a: [many("pet_type", "Pet", ["Dogs", "Cats", "Birds", "Fish", "Small Animals"])],
    c: [
      type("Pet Treats & Food", "pet-treats-food"),
      type("Pet Accessories", "pet-accessories"),
      type("Pet Beds & Furniture", "pet-beds-furniture"),
      type("Pet Toys", "pet-toys"),
      type("Personalised Pet Gifts", "personalized-pet-gifts"),
      type("Pet Grooming & Care", "pet-grooming-care"),
      type("Gifts for Pet Parents", "pet-parent-gifts"),
    ],
  }),
];

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Flattening — what the seeder and the tests work from
// ---------------------------------------------------------------------------------------------------------------------------------------------
export interface FlatType {
  name: string;
  slug: string;
  description: string | null;
  parentSlug: string | null;
  depth: number;
  /** position among its siblings, in steps of 10 (leaves room to slot new ones between) */
  sortOrder: number;
}
export interface FlatAttribute {
  typeSlug: string;
  key: string;
  label: string;
  inputType: "select" | "multi_select";
  options: string[];
  sortOrder: number;
}

/** Parents always precede their children, so a seeder can insert in order. */
export function flattenTaxonomy(tree: readonly TypeDef[] = TAXONOMY): { types: FlatType[]; attributes: FlatAttribute[] } {
  const types: FlatType[] = [];
  const attributes: FlatAttribute[] = [];
  const walk = (nodes: readonly TypeDef[], parentSlug: string | null, depth: number) => {
    nodes.forEach((node, index) => {
      types.push({ name: node.name, slug: node.slug, description: node.description ?? null, parentSlug, depth, sortOrder: index * 10 });
      (node.attributes ?? []).forEach((a, i) =>
        attributes.push({ typeSlug: node.slug, key: a.key, label: a.label, inputType: a.multi ? "multi_select" : "select", options: [...a.options], sortOrder: i * 10 }),
      );
      walk(node.children ?? [], node.slug, depth + 1);
    });
  };
  walk(tree, null, 0);
  return { types, attributes };
}

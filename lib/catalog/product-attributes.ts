import { ancestorChain, type ProductTypeRow } from "./product-types";

/** The subset of a `product_attributes` row the product page needs to turn stored values into a readable list. */
export interface ProductAttributeDefinition {
  id: string;
  product_type_id: string;
  key: string;
  label: string;
  options: readonly string[];
  sort_order: number;
}

export interface ProductAttributeValue {
  attribute_id: string;
  value: string;
}

export interface ProductSpecification {
  attributeId: string;
  key: string;
  label: string;
  values: string[];
}

/**
 * Resolves the stored attribute values for one product into the rows shown in its Specifications tab.
 *
 * Attributes are inherited down the product-type tree (a cake's Flavor comes from Cakes & Bakery, while its
 * Weight comes from Cakes), so only definitions on the product's own type or an ancestor are included. Values
 * are grouped per attribute, de-duplicated, and ordered by the admin-defined option list; unknown/legacy values
 * are appended rather than dropped. An attribute with no value never produces a row.
 */
export function resolveProductSpecifications(
  productTypeId: string | null,
  types: ProductTypeRow[],
  attributes: ProductAttributeDefinition[],
  values: ProductAttributeValue[],
): ProductSpecification[] {
  if (!productTypeId || values.length === 0) return [];

  const chain = ancestorChain(types, productTypeId);
  const depthByTypeId = new Map(chain.map((type, depth) => [type.id, depth]));

  const valuesByAttribute = new Map<string, string[]>();
  for (const { attribute_id, value } of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const current = valuesByAttribute.get(attribute_id) ?? [];
    if (!current.includes(trimmed)) current.push(trimmed);
    valuesByAttribute.set(attribute_id, current);
  }

  return attributes
    .filter((attribute) => depthByTypeId.has(attribute.product_type_id) && valuesByAttribute.has(attribute.id))
    // Parent-type attributes come first (Scent before Wax Type); within a level, use the admin's sort order.
    .sort((a, b) => (depthByTypeId.get(a.product_type_id) ?? 0) - (depthByTypeId.get(b.product_type_id) ?? 0) || a.sort_order - b.sort_order || a.label.localeCompare(b.label))
    .map((attribute) => {
      const present = valuesByAttribute.get(attribute.id) ?? [];
      const ordered = [
        ...attribute.options.filter((option) => present.includes(option)),
        ...present.filter((value) => !attribute.options.includes(value)),
      ];
      return { attributeId: attribute.id, key: attribute.key, label: attribute.label, values: ordered };
    })
    .filter((specification) => specification.values.length > 0);
}

import { useState, useEffect } from "react";
import { ProductVariation } from "@/lib/types/product";
import {
  validateVariationForm,
  validateAttributeKey,
  validateAttributeValue,
  VariationFormData,
} from "../utils/variation-validation";

export function useVariationForm(
  open: boolean,
  variation: ProductVariation | null | undefined,
  onSave: (data: VariationFormData) => Promise<void>
) {
  // Initial Empty State
  const defaultState: VariationFormData = {
    variation_name: "",
    sku: "",
    price: 0,
    compare_at_price: undefined,
    stock_quantity: 0,
    pre_order_quantity: 0,
    attributes: {},
    is_available: true,
  };

  const [formData, setFormData] = useState<VariationFormData>(defaultState);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Attribute specific state
  const [newAttributeKey, setNewAttributeKey] = useState("");
  const [newAttributeValue, setNewAttributeValue] = useState("");
  const [attributeErrors, setAttributeErrors] = useState<{
    key?: string;
    value?: string;
  }>({});

  // Sync state when modal opens
  useEffect(() => {
    if (open) {
      if (variation) {
        setFormData({
          variation_name: variation.variation_name || "",
          sku: variation.sku || "",
          price: variation.price || 0,
          compare_at_price: variation.compare_at_price || undefined,
          stock_quantity: variation.stock_quantity || 0,
          pre_order_quantity: variation.pre_order_quantity || 0,
          attributes: variation.attributes || {},
          is_available: variation.is_available ?? true,
        });
      } else {
        setFormData(defaultState);
      }
      setValidationErrors({});
      setAttributeErrors({});
      setNewAttributeKey("");
      setNewAttributeValue("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, variation]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInputChange = (field: keyof VariationFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear specific error
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const addAttribute = () => {
    if (!newAttributeKey || !newAttributeValue) return;

    // Validate inputs locally
    const keyResult = validateAttributeKey(newAttributeKey);
    const valResult = validateAttributeValue(newAttributeValue);

    if (!keyResult.isValid || !valResult.isValid) {
      setAttributeErrors({
        key: keyResult.error,
        value: valResult.error,
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      attributes: { ...prev.attributes, [newAttributeKey]: newAttributeValue },
    }));
    setNewAttributeKey("");
    setNewAttributeValue("");
    setAttributeErrors({});
  };

  const removeAttribute = (key: string) => {
    setFormData((prev) => {
      const newAttributes = { ...prev.attributes };
      delete newAttributes[key];
      return { ...prev, attributes: newAttributes };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateVariationForm(formData);

    if (!result.isValid) {
      setValidationErrors(result.errors);
      return;
    }

    await onSave(formData);
  };

  return {
    formData,
    validationErrors,
    attributeState: {
      newKey: newAttributeKey,
      setNewKey: setNewAttributeKey,
      newValue: newAttributeValue,
      setNewValue: setNewAttributeValue,
      errors: attributeErrors,
      add: addAttribute,
      remove: removeAttribute,
    },
    handleInputChange,
    handleSubmit,
  };
}

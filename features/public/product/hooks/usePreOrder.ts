"use client";

import { useState, useCallback } from "react";

type UsePreOrderReturn = {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  quantity: number;
  setQuantity: (n: number) => void;
  fullName: string;
  setFullName: (s: string) => void;
  contactNumber: string;
  setContactNumber: (s: string) => void;
  notes: string;
  setNotes: (s: string) => void;
  isSubmitted: boolean;
  errors: { fullName?: string; contactNumber?: string };
  handleSubmit: () => void;
  reset: () => void;
};

export function usePreOrder(): UsePreOrderReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [fullName, setFullName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    contactNumber?: string;
  }>({});

  const openModal = useCallback(() => setIsOpen(true), []);

  const reset = useCallback(() => {
    setIsOpen(false);
    setQuantity(1);
    setFullName("");
    setContactNumber("");
    setNotes("");
    setIsSubmitted(false);
    setErrors({});
  }, []);

  const closeModal = useCallback(() => {
    reset();
  }, [reset]);

  const handleSubmit = useCallback(() => {
    const newErrors: { fullName?: string; contactNumber?: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required.";
    }
    if (!contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitted(true);
  }, [fullName, contactNumber]);

  return {
    isOpen,
    openModal,
    closeModal,
    quantity,
    setQuantity,
    fullName,
    setFullName,
    contactNumber,
    setContactNumber,
    notes,
    setNotes,
    isSubmitted,
    errors,
    handleSubmit,
    reset,
  };
}

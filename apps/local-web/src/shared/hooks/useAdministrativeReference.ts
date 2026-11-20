import { useEffect, useState } from 'react';
import type { AdministrativeUnitsReferenceDto } from '@/types/erp';
import { apiClient } from '@/core/api/apiClient';

export function useAdministrativeReference() {
  const [reference, setReference] = useState<AdministrativeUnitsReferenceDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);

    void apiClient.getAdministrativeUnits()
      .then((result) => {
        if (!Array.isArray(result.wilayas) || result.wilayas.length !== 69) {
          throw new Error('The official 69-Wilaya reference is incomplete.');
        }

        const codes = new Set(result.wilayas.map((wilaya) => wilaya.code));
        const validItems = result.wilayas.every((wilaya) =>
          /^[0-9]{2}$/.test(wilaya.code) &&
          Boolean(wilaya.nameAr.trim()) &&
          Boolean(wilaya.nameFr.trim()) &&
          Boolean(wilaya.canonicalDisplayName.trim())
        );
        if (codes.size !== 69 || !validItems) {
          throw new Error('The official 69-Wilaya reference is invalid.');
        }

        if (active) setReference(result);
      })
      .catch(() => {
        if (active) {
          setReference(null);
          setHasError(true);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  return {
    reference,
    isLoading,
    hasError,
    retry: () => setAttempt((current) => current + 1),
  };
}

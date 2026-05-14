import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'exam_draft_sections';

/** Nettoie les objets File non-sérialisables avant stockage */
const cleanSections = (sections) =>
  sections.map((sec) => ({
    ...sec,
    exercises: sec.exercises.map((ex) => ({
      ...ex,
      questions: ex.questions.map((q) => {
        const { image, ...rest } = q; // supprime l'objet File, garde imageUrl (base64)
        return rest;
      }),
    })),
  }));

export const useSessionState = (initialValue) => {
  const [state, setState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // sessionStorage indisponible ou corrompu
    }
    return initialValue;
  });

  // Sauvegarde automatique à chaque modification
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cleanSections(state)));
    } catch {
      // quota dépassé ou sessionStorage désactivé
    }
  }, [state]);

  // Wrapper pour vider le stockage quand on veut reset manuellement
  const clearState = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    setState(initialValue);
  }, [initialValue]);

  return [state, setState, clearState];
};
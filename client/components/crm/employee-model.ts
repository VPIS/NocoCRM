import { useMemo, useState } from 'react';
import { findAIModel, useAI, type AIModel } from '#extensions/nocobase-ai';
import { getEmployeeModels } from '#extensions/nocobase-ai/providers/model';
import { CRM_ASSISTANT } from './assistant-state.js';

// The model the AI Employee's CRM assistant runs the global search's AI
// answer on: the one the ask boxes picked before they moved to Noco (still
// remembered under the same key), else the employee's first. The search
// stays on the AI Employee until its migration (step 1 of the plan).
const MODEL_KEY = 'nococrm:ask-model';

export function useEmployeeModel(): AIModel | undefined {
  const { employees, models: all } = useAI();
  const employee = employees.find((item) => item.username === CRM_ASSISTANT);
  const models = useMemo(
    () => getEmployeeModels(all, employee),
    [all, employee],
  );
  const [key] = useState(() => {
    try {
      return localStorage.getItem(MODEL_KEY) ?? '';
    } catch {
      // Storage may be unavailable: the employee's first model.
      return '';
    }
  });
  return findAIModel(models, key) ?? models[0];
}

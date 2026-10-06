const normalizeDepartments = (value) => {
  const rawValues = Array.isArray(value) ? value : [value];
  const departments = rawValues.flatMap((entry) => {
    if (typeof entry !== 'string') return entry == null ? [] : [entry];

    const text = entry.trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [text];
    } catch {
      return [text];
    }
  });

  return [...new Set(departments.map((department) => String(department).trim()).filter(Boolean))];
};

const serializeDepartments = (departments) => JSON.stringify(normalizeDepartments(departments));

module.exports = { normalizeDepartments, serializeDepartments };

const recentKey = 'msme-underwriting-recent-assessments';

export function getRecentAssessments() {
  try {
    return JSON.parse(window.localStorage.getItem(recentKey) || '[]');
  } catch (_err) {
    return [];
  }
}

export function saveRecentAssessment(entry) {
  const next = [
    {
      ...entry,
      savedAt: new Date().toISOString()
    },
    ...getRecentAssessments().filter((item) => item.assessmentId !== entry.assessmentId)
  ].slice(0, 20);

  window.localStorage.setItem(recentKey, JSON.stringify(next));
  return next;
}

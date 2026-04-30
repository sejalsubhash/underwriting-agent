import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000
});

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export async function createAssessment({ fields, files }) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  for (const file of files) {
    formData.append('files', file);
  }

  const response = await apiClient.post('/api/assessment', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
}

export async function getAssessment(assessmentId) {
  const response = await apiClient.get(`/api/assessment/${assessmentId}`);
  return response.data;
}

export async function recalculateAssessment(assessmentId, updatedFields) {
  const response = await apiClient.post(`/api/assessment/${assessmentId}/recalculate`, {
    updatedFields
  });
  return response.data;
}

export async function submitReview(assessmentId, payload) {
  const response = await apiClient.post(`/api/assessment/${assessmentId}/review`, payload);
  return response.data;
}

function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000/api`;
  }
  return 'http://localhost:8000/api';
}

export const environment = {
  production: true,
  apiUrl: getApiUrl(),
};

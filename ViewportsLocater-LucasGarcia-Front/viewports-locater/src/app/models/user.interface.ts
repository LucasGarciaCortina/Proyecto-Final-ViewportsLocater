export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

export interface AuthResponse {
  user: User;
  token: string;
  roles: string[];
}

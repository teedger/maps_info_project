export interface Alert {
  id: string;
  user_id: string | null;
  latitude: number;
  longitude: number;
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  created_at: string;
  expires_at: string;
  status: string;
  upvotes: number;
  author: string | null;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  alert_id: string;
  user_id: string | null;
  username: string;
  content: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface NewAlert {
  latitude: number;
  longitude: number;
  category: string;
  description: string;
  severity: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

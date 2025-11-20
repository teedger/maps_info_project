export interface Alert {
  id: string;
  user_id: string | null;
  latitude: number;
  longitude: number;
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  photo_url: string | null;
  created_at: string;
  expires_at: string;
  status: string;
  upvotes: number;
  author: string | null;
  comments?: Comment[];
  distance?: number;
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
  photo?: string;
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

export interface Stats {
  totalAlerts: number;
  totalUsers: number;
  totalComments: number;
  alertsLast24h: number;
  byCategory: { category: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  topContributors: { username: string; alert_count: number; total_upvotes: number }[];
}

export interface UserStats {
  total_alerts: number;
  total_upvotes: number;
  categories_used: number;
  total_comments: number;
}

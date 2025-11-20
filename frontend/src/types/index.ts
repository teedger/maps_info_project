export interface Alert {
  id: string;
  latitude: number;
  longitude: number;
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  created_at: string;
  expires_at: string;
  status: string;
  upvotes: number;
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

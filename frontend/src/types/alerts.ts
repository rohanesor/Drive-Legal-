export interface ZoneAlert {
  id: string;
  zone_type: string;
  zone_name: string;
  message: string;
  suggested_query: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  dismissed: boolean;
}

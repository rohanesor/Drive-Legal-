export interface ChatMessageItem {
  id: string;
  text: string;
  sender: 'user' | 'bot' | 'ai';
  timestamp: number | string;
  source_sections?: string[];
  confidence?: number;
  is_alert?: boolean;
  zone_type?: string;
  suggested_prompts?: string[];
}

export type Message = ChatMessageItem;

import type { ItemCategory, ItemStatus, StructuredData } from "@/lib/db/schema";

export interface ItemRow {
  id: string;
  user_id: string;
  url: string;
  source: string;
  status: ItemStatus;
  category: ItemCategory | null;
  title: string | null;
  summary: string | null;
  caption: string | null;
  transcript: string | null;
  structured_data: StructuredData | null;
  confidence: number | null;
  thumbnail_url: string | null;
  visited_at: string | null;
  stashed_at: string | null;
  expires_at: string | null;
  processing_error: string | null;
  retry_count: number;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  capture_api_key: string;
  expiry_days: number;
  created_at: string;
}

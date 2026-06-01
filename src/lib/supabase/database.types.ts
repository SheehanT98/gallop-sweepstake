export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      foalings: {
        Row: {
          id: string;
          foaled_at: string;
          sex: "colt" | "filly";
          sire: string | null;
          weight_kg: number | null;
          dam: string | null;
          assisted: boolean | null;
          season_label: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          foaled_at: string;
          sex: "colt" | "filly";
          sire?: string | null;
          weight_kg?: number | null;
          dam?: string | null;
          assisted?: boolean | null;
          season_label: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["foalings"]["Insert"]>;
      };
      wrapped_media: {
        Row: {
          id: string;
          season_label: string;
          storage_path: string;
          media_type: "image" | "video";
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_label: string;
          storage_path: string;
          media_type: "image" | "video";
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["wrapped_media"]["Insert"]>;
      };
      wrapped_audio: {
        Row: {
          season_label: string;
          storage_path: string;
          trim_start_ms: number;
          trim_end_ms: number | null;
          bpm: number | null;
          sync_to_beat: boolean;
          spotify_url: string | null;
          apple_music_url: string | null;
          track_title: string | null;
          artist: string | null;
          updated_at: string;
        };
        Insert: {
          season_label: string;
          storage_path: string;
          trim_start_ms?: number;
          trim_end_ms?: number | null;
          bpm?: number | null;
          sync_to_beat?: boolean;
          spotify_url?: string | null;
          apple_music_url?: string | null;
          track_title?: string | null;
          artist?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["wrapped_audio"]["Insert"]>;
      };
      wrapped_renders: {
        Row: {
          id: string;
          season_label: string;
          storage_path: string;
          selected_fact_ids: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          season_label: string;
          storage_path: string;
          selected_fact_ids?: string[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["wrapped_renders"]["Insert"]>;
      };
    };
  };
}

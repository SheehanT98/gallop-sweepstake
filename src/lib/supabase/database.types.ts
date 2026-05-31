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

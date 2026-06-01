export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          created_by: string | null;
          discord_webhook_url: string | null;
          spreadsheet_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          created_by?: string | null;
          discord_webhook_url?: string | null;
          spreadsheet_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          created_by?: string | null;
          discord_webhook_url?: string | null;
          spreadsheet_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      room_members: {
        Row: {
          id: string;
          room_id: string;
          email: string;
          user_id: string | null;
          display_name: string | null;
          role: 'admin' | 'member';
          status: 'invited' | 'joined';
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          email: string;
          user_id?: string | null;
          display_name?: string | null;
          role?: 'admin' | 'member';
          status?: 'invited' | 'joined';
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          email?: string;
          user_id?: string | null;
          display_name?: string | null;
          role?: 'admin' | 'member';
          status?: 'invited' | 'joined';
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_members_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          room_id: string;
          payer_id: string | null;
          expense_type: 'common' | 'personal';
          amount: number;
          category: string;
          description: string;
          paid_at: string;
          receipt_image_url: string | null;
          no_receipt_reason: string | null;
          no_receipt_note: string | null;
          split_type: 'equal' | 'custom' | null;
          status: 'pending' | 'approved' | 'rejected' | 'settled';
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          payer_id?: string | null;
          expense_type: 'common' | 'personal';
          amount: number;
          category: string;
          description: string;
          paid_at: string;
          receipt_image_url?: string | null;
          no_receipt_reason?: string | null;
          no_receipt_note?: string | null;
          split_type?: 'equal' | 'custom' | null;
          status?: 'pending' | 'approved' | 'rejected' | 'settled';
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          payer_id?: string | null;
          expense_type?: 'common' | 'personal';
          amount?: number;
          category?: string;
          description?: string;
          paid_at?: string;
          receipt_image_url?: string | null;
          no_receipt_reason?: string | null;
          no_receipt_note?: string | null;
          split_type?: 'equal' | 'custom' | null;
          status?: 'pending' | 'approved' | 'rejected' | 'settled';
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      expense_targets: {
        Row: {
          id: string;
          expense_id: string;
          user_id: string | null;
          email: string | null;
          display_name: string | null;
          amount_share: number | null;
        };
        Insert: {
          id?: string;
          expense_id: string;
          user_id?: string | null;
          email?: string | null;
          display_name?: string | null;
          amount_share?: number | null;
        };
        Update: {
          id?: string;
          expense_id?: string;
          user_id?: string | null;
          email?: string | null;
          display_name?: string | null;
          amount_share?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'expense_targets_expense_id_fkey';
            columns: ['expense_id'];
            referencedRelation: 'expenses';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_my_room_memberships: {
        Args: {
          profile_display_name?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

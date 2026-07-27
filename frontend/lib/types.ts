export type Failure = {
  id: number;
  equipment_id: number | null;
  equipment_name: string | null;
  problem: string;
  cause: string | null;
  solution: string | null;
  downtime_minutes: number | null;
  severity: string | null;
  status?: string | null;
  assigned_to?: string | null;
  next_action?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  shift?: {
    id?: number;
    shift_date: string;
  };
};

export type MaintenanceEvent = {
  id: number;
  equipment_id: number | null;
  equipment_name: string | null;
  action: string;
  parts_used: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  shift?: {
    id?: number;
    shift_date: string;
  };
};

export type ShiftNote = {
  id: number;
  category: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type HandoverItem = {
  id: number;
  equipment_id: number | null;
  equipment_name: string | null;
  title: string;
  details: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  is_overdue?: boolean;
  created_at: string;
  updated_at: string;
  shift?: {
    shift_date: string;
  };
};

export type ShiftAttachment = {
  id: number;
  original_name: string;
  stored_name: string;
  mime_type: string | null;
  attachment_type: string;
  size_bytes: number;
  caption: string | null;
  download_url: string;
  is_previewable_image: boolean;
  created_at: string;
  updated_at: string;
};

export type ShiftListItem = {
  id: number;
  shift_date: string;
  heads_count: number | null;
  co2_used_kg: string | number | null;
  co2_per_head_g: string | number | null;
  meat_temp_c: string | number | null;
  failures_count?: number;
  open_handover_items_count?: number;
  attachments_count?: number;
};

export type ShiftDetail = {
  id: number;
  shift_date: string;
  heads_count: number | null;
  work_hours: string | number | null;
  co2_start_kg: string | number | null;
  co2_end_kg: string | number | null;
  co2_used_kg: string | number | null;
  co2_per_head_g: string | number | null;
  outside_temp_c: string | number | null;
  chiller_temp_c: string | number | null;
  meat_temp_c: string | number | null;
  raw_text: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  failures: Failure[];
  maintenance_events: MaintenanceEvent[];
  shift_notes: ShiftNote[];
  handover_items: HandoverItem[];
  attachments: ShiftAttachment[];
};

export type EquipmentListItem = {
  id: number;
  name: string;
  category: string | null;
  configuration: string | null;
  notes: string | null;
  service_points?: string[] | null;
  common_issues?: Array<{
    problem: string;
    action: string;
  }> | null;
  failures_count: number;
  maintenance_events_count: number;
  open_handover_items_count: number;
};

export type EquipmentDetailResponse = {
  equipment: {
    id: number;
    name: string;
    category: string | null;
    configuration: string | null;
    notes: string | null;
    service_points: string[] | null;
    common_issues: Array<{
      problem: string;
      action: string;
    }> | null;
    failures: Failure[];
    maintenance_events: MaintenanceEvent[];
    handover_items: HandoverItem[];
  };
  summary: {
    failures_count: number;
    maintenance_count: number;
    work_history_count: number;
    open_handover_items_count: number;
  };
};

export type MorningRoundTemplateItem = {
  id: number;
  section: string;
  title: string;
  details: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MorningRoundChecklistItem = {
  morning_round_item_id: number;
  section: string;
  title: string;
  details: string | null;
  sort_order: number;
  is_active: boolean;
  is_checked: boolean;
  note: string | null;
  from_history_only: boolean;
};

export type MorningRoundEntry = {
  id: number;
  morning_round_item_id: number;
  item_section: string;
  item_title: string;
  item_details: string | null;
  is_checked: boolean;
  note: string | null;
};

export type MorningRoundRecord = {
  id: number;
  round_date: string | null;
  is_slaughter_day: boolean;
  checked_count: number;
  entries: MorningRoundEntry[];
};

export type MorningRoundResponse = {
  date: string;
  template_items: MorningRoundTemplateItem[];
  checklist_items: MorningRoundChecklistItem[];
  round: MorningRoundRecord | null;
};

export type SummaryResponse = {
  total_shifts: number;
  average_heads_count: number | null;
  average_co2_per_head_g: number | null;
  total_failures: number;
  open_handover_items: number;
  attachments_count: number;
  tracked_equipment: number;
};

export type Co2Response = {
  co2_usage_by_date: Array<{
    shift_date: string;
    co2_used_kg: number | null;
  }>;
  co2_per_head_by_date: Array<{
    shift_date: string;
    co2_per_head_g: number | null;
  }>;
};

export type FailuresResponse = {
  failures_by_equipment: Array<{
    equipment_name: string;
    failures_count: number;
  }>;
};

export type TemperaturesResponse = {
  meat_temperature_by_date: Array<{
    shift_date: string;
    meat_temp_c: number | null;
  }>;
};

export type Insight = {
  title: string;
  explanation: string;
  related_dates: string[];
  suggested_action: string;
};

export type InsightsResponse = {
  preliminary: boolean;
  overview: string | null;
  insights: Insight[];
};

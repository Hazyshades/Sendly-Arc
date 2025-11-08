export type ScheduleSourceType = 'personal_contacts' | 'twitch_table' | 'manual' | 'import';
export type ScheduleAmountType = 'fixed' | 'percentage' | 'formula';
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';
export type ScheduleStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'draft';
export type ScheduleSkipStrategy = 'catch_up' | 'skip' | 'manual';

export interface ScheduleInput {
  name: string;
  description?: string;
  sourceType: ScheduleSourceType;
  sourceConfig?: Record<string, unknown>;
  tokenSymbol?: string;
  tokenAddress?: string | null;
  network?: string;
  amountType?: ScheduleAmountType;
  amountValue: number | string;
  amountField?: string | null;
  currency?: string;
  scheduleType?: ScheduleFrequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  timeOfDay?: string | null;
  timezone?: string | null;
  cronExpression?: string | null;
  startAt?: string;
  endAt?: string | null;
  maxRuns?: number | null;
  skipStrategy?: ScheduleSkipStrategy;
  metadata?: Record<string, unknown>;
  status?: ScheduleStatus;
  paused?: boolean;
}

export interface ScheduleRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  source_type: ScheduleSourceType;
  source_config: Record<string, unknown>;
  token_symbol: string;
  token_address: string | null;
  network: string;
  amount_type: ScheduleAmountType;
  amount_value: string;
  amount_field: string | null;
  currency: string;
  schedule_type: ScheduleFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  time_of_day: string;
  timezone: string;
  cron_expression: string | null;
  start_at: string;
  end_at: string | null;
  max_runs: number | null;
  skip_strategy: ScheduleSkipStrategy;
  metadata: Record<string, unknown>;
  status: ScheduleStatus;
  paused: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  total_runs: number;
  total_failures: number;
  total_amount: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleExecution {
  id: string;
  schedule_id: string;
  user_id: string;
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed' | 'cancelled';
  run_type: 'automatic' | 'manual' | 'retry';
  queued_at: string;
  started_at: string | null;
  finished_at: string | null;
  total_recipients: number;
  success_count: number;
  failure_count: number;
  total_amount: string;
  amount_currency: string;
  error_message: string | null;
  details: unknown;
  payload_snapshot: unknown;
  result: unknown;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ScheduleWithStats extends ScheduleRow {
  last_execution: ScheduleExecution | null;
}

export interface ScheduleDetail {
  schedule: ScheduleRow;
  executions: ScheduleExecution[];
}

export interface ScheduleExecutionPage {
  data: ScheduleExecution[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}


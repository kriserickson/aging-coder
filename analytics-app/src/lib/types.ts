export interface ChatAnalytics {
  timestamp: string;
  clientId: string;
  userAgent: string;
  type: 'chat';
  question: string;
  response: string;
  ragNames: string[];
  exactMatch: boolean;
}

export interface FitAnalytics {
  timestamp: string;
  clientId: string;
  userAgent: string;
  type: 'fit-assessment';
  jobTitle: string;
  company: string | null;
  url: string | null;
  verdict: 'strong' | 'moderate' | 'weak';
}

export type AnalyticsEntry = ChatAnalytics | FitAnalytics;

export interface GroupedChatEntry {
  question: string;
  count: number;
  entries: ChatAnalytics[];
}

export interface GroupedFitEntry {
  jobTitle: string;
  company: string | null;
  verdict: string;
  count: number;
  entries: FitAnalytics[];
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  sortable: boolean;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface SearchResult {
  id: string;
  title: string;
  type: string;
  description: string | null;
  href: string;
  icon: string;
}

export interface QuickAction {
  icon: string;
  label: string;
  description: string;
  color: string;
  href: string;
}

export type Repo = {
  full_name: string;
  name: string;
  html_url: string;
  owner: { login: string };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  topics?: string[];
};

export type ExplainState = {
  open: boolean;
  loading: boolean;
  text: string;
  error: string;
  paywall: boolean;
};

export type SectionId = 'about' | 'skills' | 'projects' | 'experience' | 'contact';

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
];

export interface Profile {
  name: string;
  shortName: string;
  initials: string;
  title: string;
  tagline: string;
  location: string;
  summary: string[];
  languagesSpoken: string[];
  education: { degree: string; school: string; university: string };
  links: { email: string; linkedin: string; github: string; resume: string | null };
}

export interface SkillGroup {
  title: string;
  skills: string[];
}

export interface Experience {
  role: string;
  company: string;
  location?: string;
  start: string;
  end: string;
  project?: string;
  summary: string;
  highlights: string[];
  tech: string[];
}

export interface GithubRepo {
  name: string;
  description: string;
  readme: string;
  language: string;
  stars: number;
  url: string;
  homepage: string;
  topics: string[];
  pushedAt: string;
}

/** Curated presentation of a project; `repos` links it to one or more GitHub repos. */
export interface ProjectCuration {
  repos: string[];
  title: string;
  tagline: string;
  description: string;
  highlights: string[];
  tech: string[];
  live?: string;
}

export interface Project {
  title: string;
  tagline: string;
  description: string;
  highlights: string[];
  tech: string[];
  language: string;
  stars: number;
  updated: string;
  repoLinks: { label: string; url: string }[];
  live?: string;
}

export interface PanelTarget {
  section: SectionId;
  index?: number;
}

import { PROJECT_CURATION } from './portfolio.data';
import { GITHUB_REPOS } from './repos.generated';
import { GithubRepo, Project } from './models';

const GITHUB_USER_URL = 'https://github.com/connect-sethuvg';

function fromRepos(repos: GithubRepo[]) {
  return {
    language: repos[0]?.language ?? '',
    stars: repos.reduce((s, r) => s + r.stars, 0),
    updated: repos.map((r) => r.pushedAt).sort().at(-1) ?? '',
    repoLinks: repos.map((r) => ({ label: repos.length > 1 ? r.name : 'Source code', url: r.url })),
  };
}

/** Curated projects (in order) merged with GitHub metadata, followed by any uncurated public repos. */
function buildProjects(): Project[] {
  const byName = new Map(GITHUB_REPOS.map((r) => [r.name, r]));
  const used = new Set<string>();

  const projects: Project[] = PROJECT_CURATION.map((c) => {
    c.repos.forEach((n) => used.add(n));
    const repos = c.repos.map((n) => byName.get(n)).filter((r): r is GithubRepo => !!r);
    const meta = fromRepos(repos);
    return {
      title: c.title,
      tagline: c.tagline,
      description: c.description,
      highlights: c.highlights,
      tech: c.tech,
      live: c.live || repos.find((r) => r.homepage)?.homepage || undefined,
      ...meta,
      repoLinks: meta.repoLinks.length
        ? meta.repoLinks
        : c.repos.map((n) => ({ label: 'Source code', url: `${GITHUB_USER_URL}/${n}` })),
    };
  });

  for (const r of GITHUB_REPOS) {
    if (used.has(r.name)) continue;
    const text = r.description || r.readme || 'A public project on GitHub.';
    projects.push({
      title: r.name.replace(/[-_]+/g, ' ').trim(),
      tagline: text,
      description: r.readme || text,
      highlights: [],
      tech: [r.language, ...r.topics].filter(Boolean),
      live: r.homepage || undefined,
      ...fromRepos([r]),
    });
  }
  return projects;
}

export const PROJECTS = buildProjects();

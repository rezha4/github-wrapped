// Mirrors GitHub's GraphQL response structure to avoid runtime type errors
// and provide autocomplete when accessing nested properties like user.contributionsCollection
type GitHubGraphQLResponse = {
  data?: {
    user: {
      name: string;
      avatarUrl: string;
      organizations?: {
        nodes: Array<{
          name: string;
          login: string;
          avatarUrl: string;
        }>;
      };
      contributionsCollection?: {
        contributionCalendar?: {
          totalContributions: number;
          weeks: Array<{
            contributionDays: Array<{
              date: string;
              contributionCount: number;
              contributionLevel: string;
            }>;
          }>;
        };
        // Grouped by repository to avoid N+1 queries and reduce API calls
        pullRequestContributionsByRepository?: Array<{
          repository: {
            name: string;
            owner: { login: string; avatarUrl: string };
          };
          contributions: { totalCount: number };
        }>;
        issueContributionsByRepository?: Array<{
          repository: {
            name: string;
            owner: { login: string; avatarUrl: string };
          };
          contributions: { totalCount: number };
        }>;
      };
      repositories?: {
        nodes: Array<{
          primaryLanguage?: { name: string; color: string };
          languages: {
            // Uses 'edges' because GitHub returns weighted language data (bytes of code)
            edges: Array<{
              size: number; // Bytes written in this language
              node: { name: string; color: string };
            }>;
          };
        }>;
      };
    };
  };
  errors?: Array<{ message: string }>;
};

type Organization = {
  login: string;
  name: string;
  avatarUrl: string;
  totalPRs: number;
  totalIssues: number;
  repos: string[];
};

// Helpers
// Maps GitHub's ContributionLevel enum to react-activity-calendar's 0-4 scale
function mapContributionLevel(level: string): number {
  const mapping: Record<string, number> = {
    NONE: 0,
    FIRST_QUARTILE: 1,
    SECOND_QUARTILE: 2,
    THIRD_QUARTILE: 3,
    FOURTH_QUARTILE: 4,
  };
  return mapping[level as keyof typeof mapping] ?? 0;
}

// GitHub's API returns weeks in chronological order, but streak calculation
// needs reverse order (most recent first) to detect if the user is "currently active"
function calculateStreaks(
  days: Array<{ date: string; count: number }>
) {
  let currentStreak = 0; // Only counts if streak includes today/yesterday
  let longestStreak = 0;
  let tempStreak = 0;

  const sortedDays = [...days].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to midnight to avoid time-of-day bugs

  // Iterate backwards because we need to check if streak is still "active"
  for (let i = sortedDays.length - 1; i >= 0; i--) {
    const day = sortedDays[i];
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);

    if (day.count > 0) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);

      // Only count as "current" if the streak includes today or yesterday
      // (yesterday allows for timezone differences and late-night commits)
      const daysDiff = Math.floor(
        (today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 1) {
        currentStreak = tempStreak;
      }
    } else {
      tempStreak = 0; // Break streak on any zero-contribution day
    }
  }

  return { current: currentStreak, longest: longestStreak };
}

// Aggregates language usage across all repos because GitHub doesn't provide
// a global "languages used" query - we must calculate it ourselves
function calculateTopLanguages(repositories: any[]) {
  const languageMap = new Map<
    string,
    { size: number; color: string }
  >();

  repositories.forEach((repo) => {
    repo.languages?.edges?.forEach((edge: any) => {
      const { name, color } = edge.node;
      const size = edge.size;

      // Accumulate bytes across repos to get true language dominance
      if (languageMap.has(name)) {
        languageMap.get(name)!.size += size;
      } else {
        languageMap.set(name, { size, color });
      }
    });
  });

  const totalSize = Array.from(languageMap.values()).reduce(
    (sum, lang) => sum + lang.size,
    0
  );

  return (
    Array.from(languageMap.entries())
      .map(([name, data]) => ({
        name,
        color: data.color,
        size: data.size,
        percentage: (data.size / totalSize) * 100,
      }))
      // Sort by actual usage (bytes), not alphabetically
      .sort((a, b) => b.size - a.size)
      .slice(0, 5) // Limit to 5 to avoid UI clutter
  );
}

export const createResolver = (githubToken: string) => {
  return {
    getUserProfile: async ({
      username,
      year,
    }: {
      username: string;
      year: number;
    }) => {
      // ISO 8601 format required by GitHub's GraphQL API
      const startDate = `${year}-01-01T00:00:00Z`;
      const endDate = `${year}-12-31T23:59:59Z`;

      const query = `
        query($username: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $username) {
            name
            avatarUrl
            organizations(first: 20) {
              nodes {
                name
                login
                avatarUrl
              }
            }
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    date
                    contributionCount
                    contributionLevel
                  }
                }
              }
              pullRequestContributionsByRepository(maxRepositories: 100) {
                repository {
                  name
                  owner { login avatarUrl }
                }
                contributions(first: 100) { totalCount }
              }
              issueContributionsByRepository(maxRepositories: 100) {
                repository {
                  name
                  owner { login avatarUrl }
                }
                contributions(first: 100) { totalCount }
              }
            }
            repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: STARGAZERS, direction: DESC}) {
              nodes {
                stargazerCount
                primaryLanguage {
                  name
                  color
                }
                languages(first: 10) {
                  edges {
                    size
                    node {
                      name
                      color
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          "User-Agent": "github-wrapped", // GitHub requires User-Agent header
        },
        body: JSON.stringify({
          query,
          variables: { username, from: startDate, to: endDate },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `GitHub API error: ${response.status} - ${text}`
        );
      }

      const result = (await response.json()) as GitHubGraphQLResponse;

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      if (!result.data?.user) {
        throw new Error(`User "${username}" not found`);
      }

      const user = result.data.user;

      // Pre-populate with orgs the user is a member of, because PR/Issue data
      // might not include orgs where user only has read access
      const organizations: Organization[] = (
        user.organizations?.nodes || []
      ).map((org) => ({
        name: org.name,
        login: org.login,
        avatarUrl: org.avatarUrl,
        totalPRs: 0,
        totalIssues: 0,
        repos: [],
      }));

      // Using Map for O(1) lookups when merging PR/Issue data with orgs
      const orgMap = new Map<string, Organization>(
        organizations.map((org) => [org.login, org])
      );

      // Merge PR contributions into organization objects
      // We track PRs because they show deeper engagement than just membership
      (
        user.contributionsCollection
          ?.pullRequestContributionsByRepository || []
      ).forEach((repoNode) => {
        const orgLogin = repoNode.repository.owner.login;

        // Dynamically add orgs where user contributed but isn't a member
        // (e.g., open source contributions to shadcn-ui)
        if (!orgMap.has(orgLogin)) {
          orgMap.set(orgLogin, {
            login: orgLogin,
            name: orgLogin,
            avatarUrl: repoNode.repository.owner.avatarUrl,
            totalPRs: 0,
            totalIssues: 0,
            repos: [],
          });
        }

        const org = orgMap.get(orgLogin)!;
        org.totalPRs += repoNode.contributions.totalCount;

        // Deduplicate repos to avoid counting multiple PRs to the same repo
        if (!org.repos.includes(repoNode.repository.name)) {
          org.repos.push(repoNode.repository.name);
        }
      });

      // Same logic as PRs, but for issues
      // Tracked separately because some users contribute via issues/discussions
      (
        user.contributionsCollection
          ?.issueContributionsByRepository || []
      ).forEach((repoNode) => {
        const orgLogin = repoNode.repository.owner.login;

        if (!orgMap.has(orgLogin)) {
          orgMap.set(orgLogin, {
            login: orgLogin,
            name: orgLogin,
            avatarUrl: repoNode.repository.owner.avatarUrl,
            totalPRs: 0,
            totalIssues: 0,
            repos: [],
          });
        }

        const org = orgMap.get(orgLogin)!;
        org.totalIssues += repoNode.contributions.totalCount;
        if (!org.repos.includes(repoNode.repository.name)) {
          org.repos.push(repoNode.repository.name);
        }
      });

      // Flatten nested week structure because frontend only cares about individual days
      // for rendering the contribution heatmap
      // Replace this section in getUserProfile:
      const contributionCalendarRaw = (
        user.contributionsCollection?.contributionCalendar?.weeks ||
        []
      ).flatMap((week) => week.contributionDays);

      const contributionCalendar = contributionCalendarRaw.map(
        (day) => ({
          date: day.date,
          count: day.contributionCount,
          // Map enum string → numeric 0-4 for react-activity-calendar
          level: mapContributionLevel(
            day.contributionLevel
          ),
        })
      );

      const streak = calculateStreaks(contributionCalendar);
      const topLanguages = calculateTopLanguages(
        user.repositories?.nodes || []
      );

      return {
        username,
        name: user.name || username, // Fallback to username if display name not set
        avatarUrl: user.avatarUrl,
        organizations: Array.from(orgMap.values()),
        contributionCalendar,
        totalContributions:
          user.contributionsCollection?.contributionCalendar
            ?.totalContributions || 0,
        streak,
        topLanguages,
      };
    },
  };
};

export const schema = `
  type Organization {
    name: String!
    login: String!
    avatarUrl: String!
    totalPRs: Int!
    totalIssues: Int!
    repos: [String!]!
  }

  type ContributionDay {
    date: String!
    count: Int!
    color: String!
  }
  
  type Language {
    name: String!
    color: String
    percentage: Float!
    size: Int!
  }
  
  type Streak {
    current: Int!
    longest: Int!
  }

  type UserProfile {
    username: String!
    name: String
    avatarUrl: String!
    organizations: [Organization!]!
    contributionCalendar: [ContributionDay!]!
    totalContributions: Int!
    streak: Streak!
    topLanguages: [Language!]!
  }

  type Query {
    getUserProfile(username: String!, year: Int!): UserProfile
  }
`;

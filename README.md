Inspired by [git-wrapped](https://git-wrapped.com/).  
Issues & Pull Request are welcome!

## Tech Stack

- **pnpm** as package manager
  - Monorepo managed with **pnpm workspaces**
- **Frontend** at `/apps/web`
  - **React**
  - **Vite**
  - **Tailwind CSS**
- **Backend** at `/apps/api`
  - **Hono**
  - **GitHub GraphQL API**
- **Deployment**
  - Cloudflare Workers / Pages

## Running Locally

1. Clone the repository and install dependencies:

   ```bash
   pnpm install
   ```

2. Make sure you're at the correct directory, then run:

   ```bash
   pnpm run dev
   ```

3. Open the URL printed in your terminal to view the app.

## Contributing

Fork and create a Pull Request.

import { graphqlServer } from "@hono/graphql-server";
import { buildSchema } from "graphql";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { schema } from "./graphql/schema";
import { createResolver } from "./graphql/resolvers";

type Bindings = { GITHUB_TOKEN: string };

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: [
      "http://localhost:5173",
      "https://github-wrappped.pages.dev",
    ],
    credentials: true,
  })
);

app.get("/", (c) => {
  return c.text("github wrapped API");
});

app.use(
  "/graphql",
  graphqlServer({
    schema: buildSchema(schema),
    rootResolver: (c) => createResolver(c.env.GITHUB_TOKEN),
  })
);

/*
  spec:
  - commit calendar
  - longest streak
  - total commits
  - organizations
  - top languages
  - github badges/achievements (not yet implemented)
*/
const getWrapped = app.get("/wrapped/:username", async (c) => {
  const username = c.req.param("username");
  const year = Number(c.req.query("year") || "2025");

  try {
    const resolver = createResolver(c.env.GITHUB_TOKEN);
    const data = await resolver.getUserProfile({ username, year });

    return c.json(data);
  } catch (error) {
    return c.json({ error: error }, 500);
  }
});

export type GetWrappedType = typeof getWrapped;

export default app;

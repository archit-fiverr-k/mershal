import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your free account — Mershal" },
      { name: "description", content: "Start free today and consolidate ClickUp, Notion, and invoicing spreadsheets into one premium workspace." },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Sign up — Mershal" },
      { property: "og:description", content: "Build your premium agency workspace on Mershal. No credit card required." },
    ],
  }),
  component: () => <AuthShell mode="signup" />,
});

import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse } from "../../lib/firebase/middleware";

export const Route = createFileRoute("/api/ping")({
  server: {
    handlers: {
      GET: async () => {
        return jsonResponse({ status: "ok" });
      },
      HEAD: async () => {
        return new Response(null, { status: 200 });
      },
    },
  },
});

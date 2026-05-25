import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { Timestamp } from "firebase-admin/firestore";
import type { RevenuePoint } from "../../lib/types";

export const Route = createFileRoute("/api/dashboard/stats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const uid = decoded.uid;

          const now = new Date();
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const sevenDaysAgoTs = Timestamp.fromDate(sevenDaysAgo);

          // Run all queries in parallel
          const [
            projectsSnap,
            tasksSnap,
            invoicesSnap,
            recentProjectsSnap,
            recentClientsSnap,
            lastWeekClientsSnap,
            lastWeekProjectsSnap,
          ] = await Promise.all([
            adminDb
              .collection(`users/${uid}/projects`)
              .where("status", "not-in", ["completed", "cancelled"])
              .get(),
            adminDb
              .collection(`users/${uid}/tasks`)
              .where("status", "!=", "done")
              .get(),
            adminDb.collection(`users/${uid}/invoices`).get(),
            adminDb
              .collection(`users/${uid}/projects`)
              .orderBy("createdAt", "desc")
              .limit(5)
              .get(),
            adminDb
              .collection(`users/${uid}/clients`)
              .orderBy("createdAt", "desc")
              .limit(5)
              .get(),
            adminDb
              .collection(`users/${uid}/clients`)
              .where("createdAt", ">=", sevenDaysAgoTs)
              .get(),
            adminDb
              .collection(`users/${uid}/projects`)
              .where("createdAt", ">=", sevenDaysAgoTs)
              .get(),
          ]);

          // Calculate month revenue
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const startOfMonthTs = Timestamp.fromDate(startOfMonth);

          let monthRevenue = 0;
          let lastWeekRevenue = 0;
          let overdueInvoices = 0;

          // Build revenue chart for last 6 months
          const revenueByMonth: Record<string, number> = {};
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
            revenueByMonth[key] = 0;
          }

          for (const doc of invoicesSnap.docs) {
            const data = doc.data();
            if (data.status === "paid") {
              const paidAt: Timestamp | null = data.paidAt ?? data.updatedAt ?? null;
              if (paidAt) {
                const paidDate = paidAt.toDate();
                const key = paidDate.toLocaleString("default", {
                  month: "short",
                  year: "2-digit",
                });
                if (key in revenueByMonth) {
                  revenueByMonth[key] = (revenueByMonth[key] ?? 0) + (data.total ?? 0);
                }
                if (paidAt.seconds >= startOfMonthTs.seconds) {
                  monthRevenue += data.total ?? 0;
                }
                if (paidAt.seconds >= sevenDaysAgoTs.seconds) {
                  lastWeekRevenue += data.total ?? 0;
                }
              }
            }
            if (data.status === "overdue") {
              overdueInvoices++;
            }
          }

          const revenueChart: RevenuePoint[] = Object.entries(revenueByMonth).map(
            ([month, revenue]) => ({ month, revenue }),
          );

          return jsonResponse({
            activeProjects: projectsSnap.size,
            monthRevenue,
            pendingTasks: tasksSnap.size,
            overdueInvoices,
            lastWeekClients: lastWeekClientsSnap.size,
            lastWeekProjects: lastWeekProjectsSnap.size,
            lastWeekRevenue,
            recentProjects: recentProjectsSnap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })),
            recentClients: recentClientsSnap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })),
            revenueChart,
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[GET /api/dashboard/stats]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});

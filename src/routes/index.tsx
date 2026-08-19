import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    console.log("Root index beforeLoad: redirecting to /dashboard");
    throw redirect({ to: "/dashboard" });
  },
});

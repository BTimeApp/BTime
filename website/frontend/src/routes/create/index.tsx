import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/create/")({
  component: CreatePage,
});

function CreatePage() {
  return <div>Hello "/create/"!</div>;
}

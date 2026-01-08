import { Header, HeaderTitle } from "@/components/common/header";
import PageWrapper from "@/components/common/page-wrapper";
import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/playground/")({
  component: RouteComponent,
  loader: () => {
    if (import.meta.env.PROD) {
      throw notFound({ routeId: "__root__" });
    }
  },
});

function RouteComponent() {
  return (
    <PageWrapper>
      <Header>
        <HeaderTitle title="Playground" />
      </Header>
      <div className="flex flex-col h-full w-full py-3">
        <div className="text-center">
          (Dev) Use this page to prototype quickly. Please don`t commit changes
          to this file.
        </div>
      </div>
    </PageWrapper>
  );
}

"use client";
import { Header, HeaderTitle } from "@/components/common/header";
import PageWrapper from "@/components/common/page-wrapper";
import { notFound } from "next/navigation";

export default function Page() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

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

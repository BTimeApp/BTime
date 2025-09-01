"use client";
import Header from "@/components/common/header";

export default function Page() {
  return (
    <div className="flex flex-col h-screen w-full">
      <Header>
        <div className="flex flex-row">
          <div className="flex-1">
            <p className="text-3xl font-bold text-center">Playground</p>
          </div>
        </div>
      </Header>
      <div className="flex flex-col h-full w-full py-3">
        <div className="text-center">
          (Dev) Use this page to prototype quickly. Please don't commit changes
          to this file.
        </div>
      </div>
    </div>
  );
}

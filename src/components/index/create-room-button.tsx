import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function CreateRoomButton() {
  return (
    <Button variant="primary" size="lg" className={cn("p-0 w-42")}>
      <Link href="/create" className="grow">
        <h1 className="font-bold text-center text-2xl">Create Room</h1>
      </Link>
    </Button>
  );
}

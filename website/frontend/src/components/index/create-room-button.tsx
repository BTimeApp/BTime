import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export default function CreateRoomButton({
  className,
}: {
  className?: string;
}) {
  return (
    <Button variant="primary" size="lg" className={className}>
      <Link to="/create" className="grow w-full">
        <h1 className="font-bold text-center text-2xl w-full truncate">
          Create Room
        </h1>
      </Link>
    </Button>
  );
}

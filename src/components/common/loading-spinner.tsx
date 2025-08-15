import { LoaderCircle } from "lucide-react";

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-[100%]">
      <LoaderCircle className="animate-spin w-12 h-12 text-primary" />
    </div>
  );
}

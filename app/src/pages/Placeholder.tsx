import { Construction } from "lucide-react";
import { EmptyState } from "../components/states";

export default function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-semibold text-ink">{title}</h1>
      <EmptyState
        icon={Construction}
        title={`${title} arrives in ${phase}`}
        description="The schema and navigation are wired up. This module gets built in the upcoming phase."
      />
    </div>
  );
}

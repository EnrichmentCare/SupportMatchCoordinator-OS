import * as React from "react";
import { Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { AddTaskModal } from "./AddTaskModal";
import type { Participant } from "../types/database";

// A "New task" button for the app header — available on every page.
export function GlobalAddTask() {
  const { currentOrg } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [participants, setParticipants] = React.useState<Participant[]>([]);

  async function openModal() {
    if (currentOrg && participants.length === 0) {
      const { data } = await supabase.from("participants").select("*")
        .eq("org_id", currentOrg.id).order("first_name");
      setParticipants((data as Participant[]) ?? []);
    }
    setOpen(true);
  }

  return (
    <>
      <button onClick={openModal}
        className="flex items-center gap-1.5 rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600">
        <Plus className="h-4 w-4" /> New task
      </button>
      <AddTaskModal open={open} onClose={() => setOpen(false)}
        onCreated={() => setOpen(false)} participants={participants} />
    </>
  );
}

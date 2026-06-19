import * as React from "react";
import { Heart } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-brand-700 p-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <Heart className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">Coordinator OS</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold leading-tight">
            Run your whole NDIS caseload from one place.
          </h1>
          <p className="mt-4 max-w-md text-brand-100">
            Participants, referrals, providers, funding and tasks — and a worker shortlist
            one click away, powered by Support Match. Free for coordinators.
          </p>
        </div>
        <p className="text-sm text-brand-100/80">Matched, not allocated.</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

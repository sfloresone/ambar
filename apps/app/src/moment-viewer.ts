import type { Moment } from "@ambar/core";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import * as v from "valibot";

/** History state of a viewer opened from inside the app, so closing it can go Back. */
const OpenedInApp = v.object({ openedInApp: v.literal(true) });

/**
 * The moment viewer, kept in the URL as ?m=<id>: Back closes it and the link can be shared. Opened from
 * the app, closing goes back; opened from a link, closing just removes the parameter (never leaves).
 */
export function useMomentViewer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  return {
    viewingId: params.get("m"),
    open(moment: Moment) {
      const next = new URLSearchParams(params);

      next.set("m", moment.id);
      navigate({ search: `?${next}` }, { state: v.parse(OpenedInApp, { openedInApp: true }) });
    },
    close() {
      if (v.is(OpenedInApp, location.state)) {
        navigate(-1);

        return;
      }

      const next = new URLSearchParams(params);

      next.delete("m");
      navigate({ search: next.size > 0 ? `?${next}` : "" }, { replace: true });
    },
  };
}

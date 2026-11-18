import { HttpError } from "@/lib/api-error";
import { createAssignments } from "@/lib/draw";
import type { Draw } from "@/lib/types";

export const DRAW_SIZE = { min: 3, max: 50 } as const;

export type RedrawPlan = {
  participants: Array<{ id: string; name: string }>;
  exclusions: Draw["exclusions"];
  assignments: Draw["assignments"];
  addedIds: string[];
  removedIds: string[];
};

/**
 * Works out a fresh draw after the organizer added or removed people. Existing exclusions stay, minus those that
 * mention someone who left. Throws the same stable codes as creating a draw.
 */
export function planRedraw(
  draw: Pick<Draw, "participants" | "exclusions">,
  change: { addNames: string[]; removeIds: string[] },
  newId: () => string,
  random?: (maxExclusive: number) => number,
): RedrawPlan {
  const known = new Set(draw.participants.map((participant) => participant.id));
  for (const id of change.removeIds) {
    if (!known.has(id)) throw new HttpError(404, "participant_not_found");
  }
  const removed = new Set(change.removeIds);
  const added = change.addNames.map((name) => ({ id: newId(), name }));
  const participants = [
    ...draw.participants.filter((participant) => !removed.has(participant.id)).map(({ id, name }) => ({ id, name })),
    ...added,
  ];
  if (participants.length < DRAW_SIZE.min || participants.length > DRAW_SIZE.max) {
    throw new HttpError(400, "invalid_participant_count", { min: DRAW_SIZE.min, max: DRAW_SIZE.max });
  }
  const exclusions = draw.exclusions.filter(({ from, to }) => !removed.has(from) && !removed.has(to));
  const result = createAssignments(participants, exclusions, random ? { random } : undefined);
  if (result.kind === "impossible") throw new HttpError(422, "draw_impossible");
  if (result.kind === "technical-limit") throw new HttpError(503, "draw_generation_timeout");
  return {
    participants,
    exclusions,
    assignments: result.assignments,
    addedIds: added.map((participant) => participant.id),
    removedIds: [...removed],
  };
}

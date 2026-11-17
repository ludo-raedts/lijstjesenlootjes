import { randomInt } from "node:crypto";

export type DrawParticipantInput = { id: string; name: string };
export type DrawExclusion = { from: string; to: string };

function allowed(
  giver: string,
  recipient: string,
  excluded: Set<string>,
) {
  return giver !== recipient && !excluded.has(`${giver}:${recipient}`);
}

export function hasPerfectMatching(
  participants: DrawParticipantInput[],
  exclusions: DrawExclusion[],
) {
  const excluded = new Set(exclusions.map(({ from, to }) => `${from}:${to}`));
  const recipientToGiver = new Map<string, string>();

  const visit = (giver: string, seen: Set<string>): boolean => {
    for (const recipient of participants) {
      if (!allowed(giver, recipient.id, excluded) || seen.has(recipient.id)) continue;
      seen.add(recipient.id);
      const currentGiver = recipientToGiver.get(recipient.id);
      if (!currentGiver || visit(currentGiver, seen)) {
        recipientToGiver.set(recipient.id, giver);
        return true;
      }
    }
    return false;
  };

  return participants.every((participant) => visit(participant.id, new Set()));
}

export function fisherYates<T>(items: T[], random = (maxExclusive: number) => randomInt(0, maxExclusive)) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = random(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function createAssignments(
  participants: DrawParticipantInput[],
  exclusions: DrawExclusion[],
  options?: { attempts?: number; random?: (maxExclusive: number) => number },
) {
  const excluded = new Set(exclusions.map(({ from, to }) => `${from}:${to}`));
  if (!hasPerfectMatching(participants, exclusions)) {
    return { kind: "impossible" as const };
  }
  const attempts = options?.attempts ?? Math.max(20_000, participants.length * 4_000);
  const random = options?.random ?? ((maxExclusive: number) => randomInt(0, maxExclusive));
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const recipients = fisherYates(participants, random);
    const valid = participants.every((giver, index) =>
      allowed(giver.id, recipients[index].id, excluded),
    );
    if (valid) {
      return {
        kind: "success" as const,
        assignments: participants.map((giver, index) => ({
          giverId: giver.id,
          recipientId: recipients[index].id,
        })),
      };
    }
  }
  return { kind: "technical-limit" as const };
}

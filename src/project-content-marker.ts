export type ProjectContentMarker = {
  fingerprint: string;
  heliportDraftRevision: number;
  heliportFingerprint: string;
  heliportRevision: number;
  revision: number;
};

export function createProjectContentMarker(
  marker: ProjectContentMarker,
): ProjectContentMarker {
  return { ...marker };
}

export function sameProjectContentMarker(
  left: ProjectContentMarker | null,
  right: ProjectContentMarker | null,
) {
  return Boolean(
    left
    && right
    && left.fingerprint === right.fingerprint
    && left.revision === right.revision
    && left.heliportFingerprint === right.heliportFingerprint
    && left.heliportRevision === right.heliportRevision
    && left.heliportDraftRevision === right.heliportDraftRevision
  );
}

export function projectContentMarkerChanged(
  baseline: ProjectContentMarker,
  current: ProjectContentMarker,
) {
  return !sameProjectContentMarker(baseline, current);
}

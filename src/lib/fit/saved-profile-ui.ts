type SavedEvidenceKind = "body_measurement" | "reference_garment" | "manual_reference_garment";

export function savedFitEvidenceDescription(evidence: readonly SavedEvidenceKind[]): string {
  if (evidence.includes("reference_garment")) return "a verified saved size reference";
  if (evidence.includes("body_measurement")) return "saved body measurements";
  return "saved fit evidence";
}

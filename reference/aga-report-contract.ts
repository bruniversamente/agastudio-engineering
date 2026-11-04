import type { OpeaGridCalculationOutput, OpeaGridPointResult } from "./opea-grid-analysis";

export const AGA_VIABILITY_REPORT_CONTRACT = "aga.viability.report.v1" as const;

export type AgaReportValidationCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
};

export type AgaReportValidation = {
  contract: typeof AGA_VIABILITY_REPORT_CONTRACT;
  passed: boolean;
  checkedAt: string;
  runId: string;
  inputFingerprint: string;
  checks: AgaReportValidationCheck[];
};

const REQUIRED_COMMON_SECTIONS = [
  "identification",
  "executive-conclusion",
  "results",
  "height-surface",
  "technical-map",
  "technical-sections",
  "point-table",
  "calculation-memory",
  "caveats",
  "provenance",
  "signature",
] as const;

const REQUIRED_CONTENT_LAYOUTS = [
  ["reference-data", "method"],
  ["objective", "sources", "premises", "methodology"],
] as const;

const POINT_FIELDS: Array<{
  field: string;
  value: (point: OpeaGridPointResult) => number | string | null | undefined;
}> = [
  { field: "point_id", value: (point) => point.point_id },
  { field: "latitude", value: (point) => point.latitude },
  { field: "longitude", value: (point) => point.longitude },
  { field: "terrain_elevation_m", value: (point) => point.terrain_elevation_m },
  { field: "top_altitude_m", value: (point) => point.top_altitude_m },
  { field: "altitude_limit_m", value: (point) => point.altitude_limit_m },
  { field: "max_height_m", value: (point) => point.max_height_m },
  { field: "margin_m", value: (point) => point.margin_m },
  { field: "penetration_m", value: (point) => point.penetration_m },
  { field: "critical_surface_id", value: (point) => point.critical_surface_id ?? "" },
  { field: "status", value: (point) => point.status },
  { field: "plan_layers", value: (point) => point.plan_layers.join("; ") },
];

const NUMERIC_REPORT_ROUNDING_TOLERANCE = 0.00501;

export function bindAndValidateAgaViabilityReport(
  reportBytes: Uint8Array,
  options: {
    output: OpeaGridCalculationOutput;
    runId: string;
    inputFingerprint: string;
    checkedAt: string;
  },
) {
  const source = new TextDecoder().decode(reportBytes);
  const html = bindReportProvenance(source, options.runId, options.inputFingerprint);
  const validation = validateAgaViabilityReportHtml(html, options);
  return { data: new TextEncoder().encode(html), html, validation };
}

export function validateAgaViabilityReportHtml(
  html: string,
  options: {
    output: OpeaGridCalculationOutput;
    runId: string;
    inputFingerprint: string;
    checkedAt: string;
  },
): AgaReportValidation {
  const checks: AgaReportValidationCheck[] = [];
  const hasContract = html.includes(`data-aga-report-contract="${AGA_VIABILITY_REPORT_CONTRACT}"`)
    && html.includes(`name="aga-report-contract" content="${AGA_VIABILITY_REPORT_CONTRACT}"`);
  checks.push({ id: "contract", label: "Modelo aprovado identificado", passed: hasContract });

  const hasSection = (section: string) => html.includes(`data-report-section="${section}"`);
  const missingSections = REQUIRED_COMMON_SECTIONS.filter((section) => !hasSection(section));
  const hasApprovedContentLayout = REQUIRED_CONTENT_LAYOUTS.some((layout) => layout.every(hasSection));
  checks.push({
    id: "sections",
    label: "Seções obrigatórias presentes",
    passed: missingSections.length === 0 && hasApprovedContentLayout,
    ...(missingSections.length || !hasApprovedContentLayout ? {
      detail: [
        ...(missingSections.length ? [`Ausentes: ${missingSections.join(", ")}`] : []),
        ...(!hasApprovedContentLayout ? ["Conteúdo esperado: reference-data + method"] : []),
      ].join("; "),
    } : {}),
  });

  const expectedStatus = reportOverallStatus(options.output);
  checks.push({
    id: "conclusion",
    label: "Conclusão executiva confere com a rodada",
    passed: html.includes(`data-overall-status="${expectedStatus}"`),
    detail: expectedStatus.replaceAll("_", " "),
  });

  const pointIssues: string[] = [];
  for (const point of options.output.points) {
    const row = reportPointRow(html, point.point_id);
    if (!row) {
      pointIssues.push(`${point.point_id}: linha ausente`);
      continue;
    }
    for (const definition of POINT_FIELDS) {
      if (!reportPointFieldMatches(row, definition.field, definition.value(point))) {
        pointIssues.push(`${point.point_id}.${definition.field}`);
      }
    }
  }
  checks.push({
    id: "values",
    label: "Valores impressos conferem com viability_result.json",
    passed: pointIssues.length === 0,
    ...(pointIssues.length ? { detail: pointIssues.slice(0, 8).join(", ") } : { detail: `${options.output.points.length} ponto(s) conferido(s)` }),
  });

  const provenanceMatches = html.includes(`data-report-provenance="run-id" data-value="${escapeHtml(options.runId)}"`)
    && html.includes(`data-report-provenance="input-fingerprint" data-value="${escapeHtml(options.inputFingerprint)}"`);
  checks.push({
    id: "provenance",
    label: "Rodada e impressão digital vinculadas",
    passed: provenanceMatches,
  });

  checks.push({
    id: "point-role",
    label: "Origem dos pontos identificada na rodada",
    passed: (
      /vertices do OPEA|vértices do OPEA/i.test(html)
      && /amostrou o perimetro|amostrou o perímetro|pontos? de borda/i.test(html)
      && /pontos? internos|amostras internas/i.test(html)
    ) || (
      /pontos P (?:sao|são) amostrais/i.test(html)
      && /nao substituem vertices do OPEA|não substituem vértices do OPEA/i.test(html)
    ),
  });

  return {
    contract: AGA_VIABILITY_REPORT_CONTRACT,
    passed: checks.every((check) => check.passed),
    checkedAt: options.checkedAt,
    runId: options.runId,
    inputFingerprint: options.inputFingerprint,
    checks,
  };
}

function bindReportProvenance(html: string, runId: string, inputFingerprint: string) {
  return html
    .replace(
      /<dd data-report-provenance="run-id"(?: data-value="[^"]*")?>[\s\S]*?<\/dd>/,
      `<dd data-report-provenance="run-id" data-value="${escapeHtml(runId)}">${escapeHtml(runId)}</dd>`,
    )
    .replace(
      /<dd data-report-provenance="input-fingerprint"(?: data-value="[^"]*")?>[\s\S]*?<\/dd>/,
      `<dd data-report-provenance="input-fingerprint" data-value="${escapeHtml(inputFingerprint)}">${escapeHtml(inputFingerprint)}</dd>`,
    );
}

function reportPointRow(html: string, pointId: string) {
  const marker = `data-report-point="${escapeHtml(pointId)}"`;
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return "";
  const rowStart = html.lastIndexOf("<tr", markerIndex);
  const rowEnd = html.indexOf("</tr>", markerIndex);
  return rowStart >= 0 && rowEnd >= 0 ? html.slice(rowStart, rowEnd + 5) : "";
}

function reportOverallStatus(output: OpeaGridCalculationOutput) {
  const statuses = new Set(output.points.map((point) => point.status));
  if (!output.points.length || statuses.has("DADOS_INSUFICIENTES")) return "DADOS_INSUFICIENTES";
  if (statuses.has("PENETRANTE")) return "NAO_VIAVEL";
  if (statuses.has("CRITICO")) return "CRITICO";
  if (statuses.size === 1 && statuses.has("FORA_DO_ESCOPO")) return "SEM_INCIDENCIA";
  return "VIAVEL";
}

function reportPointFieldMatches(
  row: string,
  field: string,
  expected: number | string | null | undefined,
) {
  if (typeof expected === "number" && Number.isFinite(expected)) {
    return reportFieldDataValues(row, field).some((value) => {
      const printed = Number(value.replace(",", "."));
      return Number.isFinite(printed)
        && Math.abs(printed - expected) <= NUMERIC_REPORT_ROUNDING_TOLERANCE;
    });
  }

  const expectedValues = reportFieldValues(field, reportValue(expected));
  return expectedValues.some((value) => row.includes(
    `data-report-field="${field}" data-value="${escapeHtml(value)}"`,
  ));
}

function reportFieldDataValues(row: string, field: string) {
  const fieldPattern = escapeRegExp(field);
  const matcher = new RegExp(`data-report-field="${fieldPattern}"\\s+data-value="([^"]*)"`, "g");
  const values: string[] = [];
  for (const match of row.matchAll(matcher)) values.push(match[1]);
  return values;
}

function reportValue(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value.toFixed(2).replace(".", ",") : "";
  return String(value ?? "");
}

function reportFieldValues(field: string, expected: string) {
  if (field !== "status") return [expected];
  const displayedStatus = {
    VIAVEL: "VIÁVEL",
    CRITICO: "CRÍTICO",
    PENETRANTE: "VIOLA",
    FORA_DO_ESCOPO: "FORA DO ESCOPO",
    DADOS_INSUFICIENTES: "DADOS INSUFICIENTES",
  }[expected];
  return displayedStatus ? [expected, displayedStatus] : [expected];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

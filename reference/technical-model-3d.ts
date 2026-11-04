import type { AgaAnalysisRun } from "./aga-project-model.ts";
import type { OpeaGridCalculationOutput, OpeaGridInputJson } from "./opea-grid-analysis.ts";
import type { HeliportAnalysisRunSnapshot } from "./heliport-analysis-run.ts";
import { appendRunway, appendEquipment, type ModelContextSnapshot } from "./technical-model-context.ts";
import { isCompleteSurfaceModel, type CompleteSurfaceModel } from "./technical-surface-model.ts";
import { appendVisualTerrain } from "./visual-terrain-3d.ts";

export type ModelVertex = { x: number; y: number; z: number };
export type ModelLayer = "terrain" | "surfaces" | "objects" | "runway" | "equipment" | "equipmentProtection" | "contextTerrain" | "contours";
export type ModelReference = { id: string; label: string; layer: ModelLayer; position?: ModelVertex; altitude?: number; source: string; detail: string };
export type ModelPoint = {
  id: string; label: string; position: ModelVertex; base?: ModelVertex;
  altitude: number; terrain?: number; limit?: number | null; margin?: number | null;
  status?: string; surface?: string | null;
};
export type ModelMesh = { id: string; label: string; layer: ModelLayer; vertices: ModelVertex[]; triangles: number[]; surfaceId?: string; limitingPointCount?: number };
export type TechnicalModel = {
  runId: string; fingerprint: string; datum: string; terrainSource: string;
  points: ModelPoint[]; terrain: ModelVertex[]; meshes: ModelMesh[]; notices: string[];
  references: ModelReference[]; lines: Array<{ id: string; layer: ModelLayer; vertices: ModelVertex[]; segments?: boolean; major?: boolean }>;
  labels?: Array<{ label:string; position:ModelVertex; layer:ModelLayer }>;
  contextTerrain?: { source:string; datum:string; interval:number; samples:number };
};
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Ear clipping preserves concave footprints instead of filling their convex hull. */
export function triangulateModelPolygon(vertices: ModelVertex[]): number[] {
  const ring = vertices.map((_, i) => i).filter((i) => i === 0 || Math.hypot(vertices[i].x - vertices[i - 1].x, vertices[i].z - vertices[i - 1].z) > 1e-6);
  if (ring.length > 1 && Math.hypot(vertices[ring[0]].x - vertices[ring.at(-1)!].x, vertices[ring[0]].z - vertices[ring.at(-1)!].z) < 1e-6) ring.pop();
  const cross = (a: number, b: number, c: number) => (vertices[b].x - vertices[a].x) * (vertices[c].z - vertices[a].z) - (vertices[b].z - vertices[a].z) * (vertices[c].x - vertices[a].x);
  const area = ring.reduce((sum, a, i) => { const b = ring[(i + 1) % ring.length]; return sum + vertices[a].x * vertices[b].z - vertices[b].x * vertices[a].z; }, 0);
  if (area < 0) ring.reverse();
  const result: number[] = [];
  while (ring.length > 2) {
    let clipped = false;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[(i + ring.length - 1) % ring.length], b = ring[i], c = ring[(i + 1) % ring.length];
      if (cross(a, b, c) <= 1e-9) continue;
      if (ring.some((p) => p !== a && p !== b && p !== c && cross(a, b, p) >= -1e-9 && cross(b, c, p) >= -1e-9 && cross(c, a, p) >= -1e-9)) continue;
      result.push(a, b, c); ring.splice(i, 1); clipped = true; break;
    }
    if (!clipped) return []; // Invalid or degenerate polygon must not create invented faces.
  }
  return result;
}

/** Display coordinates only. Original altitudes and engine results remain unchanged.
 * WGS84 ECEF -> local east/north avoids mixing UTM zones; Y retains absolute elevation. */
export function localModelProjection(latitude: number, longitude: number, altitude: number) {
  const rad = Math.PI / 180;
  const phi = latitude * rad, lambda = longitude * rad;
  function ecef(lat: number, lon: number) {
    const p = lat * rad, l = lon * rad;
    const n = 6378137 / Math.sqrt(1 - 0.00669437999014 * Math.sin(p) ** 2);
    return [n * Math.cos(p) * Math.cos(l), n * Math.cos(p) * Math.sin(l), n * (1 - 0.00669437999014) * Math.sin(p)];
  }
  const origin = ecef(latitude, longitude);
  return (lat: number, lon: number, elevation: number): ModelVertex => {
    const v = ecef(lat, lon).map((value, i) => value - origin[i]);
    return { x: -Math.sin(lambda) * v[0] + Math.cos(lambda) * v[1], y: elevation - altitude,
      z: Math.sin(phi) * Math.cos(lambda) * v[0] + Math.sin(phi) * Math.sin(lambda) * v[1] - Math.cos(phi) * v[2] };
  };
}

/** Bowyer-Watson triangulation for the display, never a source of calculated limits.
 * Duplicate XYs are excluded. Large clouds remain complete as points rather than freezing the UI. */
export function triangulateModelPoints(vertices: ModelVertex[], maxEdge = Infinity): number[] {
  if (vertices.length < 3 || vertices.length > 5000) return [];
  const seen = new Set<string>();
  const ids = vertices.map((_, i) => i).filter((i) => {
    const key = `${vertices[i].x.toFixed(5)}:${vertices[i].z.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  if (ids.length < 3) return [];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const v of vertices) { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z); }
  const d = Math.max(maxX - minX, maxZ - minZ);
  if (!d) return [];
  // Normalize for stable circumcircles even for very small or very large sites.
  const p = vertices.map((v) => ({ x: (v.x - minX) / d, z: (v.z - minZ) / d }));
  const n = p.length;
  p.push({ x: -20, z: -20 }, { x: 20, z: -20 }, { x: 0, z: 20 });
  type Triangle = { ids: number[]; x: number; z: number; r: number };
  function triangle(a: number, b: number, c: number): Triangle | null {
    const A = p[a], B = p[b], C = p[c];
    const den = 2 * (A.x * (B.z - C.z) + B.x * (C.z - A.z) + C.x * (A.z - B.z));
    if (Math.abs(den) < 1e-12) return null;
    const aa = A.x * A.x + A.z * A.z, bb = B.x * B.x + B.z * B.z, cc = C.x * C.x + C.z * C.z;
    const x = (aa * (B.z - C.z) + bb * (C.z - A.z) + cc * (A.z - B.z)) / den;
    const z = (aa * (C.x - B.x) + bb * (A.x - C.x) + cc * (B.x - A.x)) / den;
    return { ids: [a, b, c], x, z, r: (x - A.x) ** 2 + (z - A.z) ** 2 };
  }
  let triangles: Triangle[] = [triangle(n, n + 1, n + 2)!];
  for (const id of ids) {
    const edges = new Map<string, number[]>();
    triangles = triangles.filter((t) => {
      if ((p[id].x - t.x) ** 2 + (p[id].z - t.z) ** 2 > t.r + 1e-12) return true;
      for (let i = 0; i < 3; i++) {
        const a = t.ids[i], b = t.ids[(i + 1) % 3], key = `${Math.min(a, b)}:${Math.max(a, b)}`;
        if (edges.has(key)) edges.delete(key); else edges.set(key, [a, b]);
      }
      return false;
    });
    for (const [a, b] of edges.values()) { const t = triangle(a, b, id); if (t) triangles.push(t); }
  }
  return triangles.filter((t) => t.ids.every((i) => i < n) && t.ids.every((a, i) => {
    const b = t.ids[(i + 1) % 3];
    return Math.hypot(vertices[a].x - vertices[b].x, vertices[a].z - vertices[b].z) <= maxEdge;
  })).flatMap((t) => t.ids);
}

export function buildTechnicalModel(run: AgaAnalysisRun, reconstructed?: CompleteSurfaceModel): TechnicalModel {
  const model: TechnicalModel = { runId: run.id, fingerprint: run.inputFingerprint, datum: "Não informado",
    terrainSource: "Sem topografia nesta rodada", points: [], terrain: [], meshes: [], notices: [], references: [], lines: [] };
  if (run.status !== "completed") { model.notices.push("Conclua o cálculo para visualizar o modelo desta rodada."); return model; }
  const result = run.result?.rawResult as Partial<OpeaGridCalculationOutput & HeliportAnalysisRunSnapshot> | undefined;
  if (result?.schemaVersion === "aga.heliport.analysis-run.v1") return buildHeliportModel(model, result as HeliportAnalysisRunSnapshot);
  if (result?.mode !== "VIABILIDADE_MALHA" || !Array.isArray(result.points)) {
    model.notices.push("Esta rodada não contém a geometria e a topografia da análise em malha. Gere uma nova rodada de viabilidade."); return model;
  }
  const input = (run.inputSnapshot as { input?: OpeaGridInputJson } | undefined)?.input;
  const valid = result.points.filter((p) => finite(p.latitude) && finite(p.longitude) && finite(p.terrain_elevation_m));
  if (!valid.length) { model.notices.push("Não há cotas topográficas válidas nesta rodada."); return model; }
  const origin = valid[0];
  const project = localModelProjection(origin.latitude, origin.longitude, origin.terrain_elevation_m!);
  model.datum = result.vertical_datum ?? "Não informado";
  appendRunway(model, input, project);
  appendEquipment(model, (run.inputSnapshot as { context3d?: ModelContextSnapshot })?.context3d, project);
  model.terrainSource = "Cotas e amostras da rodada de viabilidade";
  const limitingCounts = new Map<string, number>();
  for (const p of valid) {
    const base = project(p.latitude, p.longitude, p.terrain_elevation_m!);
    model.terrain.push(base);
    if (finite(p.top_altitude_m)) model.points.push({ id: p.point_id, label: p.source_point_id || p.point_id,
      position: project(p.latitude, p.longitude, p.top_altitude_m), base,
      altitude: p.top_altitude_m, terrain: p.terrain_elevation_m, limit: p.altitude_limit_m,
      margin: p.margin_m, status: p.status, surface: p.critical_surface_id });
    const applicable = (p.surfaces ?? []).filter((s) => s.status === "APPLICABLE" && finite(s.altitude_limit_m));
    const minimum = Math.min(...applicable.map((s) => s.altitude_limit_m!));
    for (const id of new Set(applicable.filter((s) => Math.abs(s.altitude_limit_m!-minimum) <= 0.001).map((s) => s.surface_id)))
      limitingCounts.set(id, (limitingCounts.get(id) ?? 0)+1);
  }
  for (const p of input?.terrain_samples ?? []) {
    if (finite(p.latitude) && finite(p.longitude) && finite(p.elevation_m)) model.terrain.push(project(p.latitude, p.longitude, p.elevation_m));
  }
  const seenTerrain = new Set<string>();
  model.terrain = model.terrain.filter((p) => {
    const key = `${p.x.toFixed(5)}:${p.y.toFixed(5)}:${p.z.toFixed(5)}`;
    if (seenTerrain.has(key)) return false;
    seenTerrain.add(key); return true;
  });
  const edge = finite(result.grid_spacing_m) && result.grid_spacing_m > 0 ? result.grid_spacing_m * 1.6 : 0;
  model.meshes.push({ id: "terrain", label: "Topografia", layer: "terrain", vertices: model.terrain, triangles: triangulateModelPoints(model.terrain, edge) });
  const complete = reconstructed ?? result.surface_model;
  if (isCompleteSurfaceModel(complete) && complete.vertical_datum === model.datum && complete.calculation_crs === result.calculation_crs) {
    // Replace the approximate display strip with the motor's exact strip/profile.
    model.meshes = model.meshes.filter((mesh) => mesh.id !== "runway-strip");
    model.lines = model.lines.filter((line) => !line.id.startsWith("runway-edge:"));
    model.notices = model.notices.filter((notice) => !notice.startsWith("Pista: eixo, cabeceiras"));
    model.notices.push("Pista: eixo, cabeceiras e faixa de proteção. A faixa compartilha a borda e o perfil de origem da transição; a largura do pavimento não foi informada.");
    for (const mesh of complete.meshes) model.meshes.push({ ...mesh, surfaceId: mesh.layer === "surfaces" ? mesh.id : undefined,
      limitingPointCount: limitingCounts.get(mesh.id) ?? 0,
      vertices: mesh.vertices.map(([lat, lon, altitude]) => project(lat, lon, altitude)) });
    model.notices.push("Superfícies completas geradas pela geometria do motor. Curvas são representadas por faces; limites e margens dos pontos permanecem os da rodada original. Laranja indica a superfície de menor limite em um ou mais pontos, incluindo empates.");
  } else model.notices.push("Esta rodada ainda não possui a geometria completa das superfícies. O recorte entre pontos não é usado como substituto.");
  for (const object of input?.opea_surfaces ?? []) {
    if (!finite(object.top_altitude_m) || object.vertices.some((p) => !finite(p.latitude) || !finite(p.longitude))) continue;
    const vertices = object.vertices.map((p) => project(p.latitude, p.longitude, object.top_altitude_m));
    const triangles = triangulateModelPolygon(vertices);
    // Only build walls where the original snapshot records the base of that vertex.
    const bases = object.vertices.map((p) => input!.opea_vertices.find((v) => Math.abs(v.latitude - p.latitude) < 1e-8 && Math.abs(v.longitude - p.longitude) < 1e-8));
    const count = vertices.length;
    if (bases.every((p) => p && finite(p.terrain_elevation_m))) {
      vertices.push(...bases.map((p) => project(p!.latitude, p!.longitude, p!.terrain_elevation_m)));
      for (let i = 0; i < count; i++) { const j = (i + 1) % count; triangles.push(i, j, count + j, i, count + j, count + i); }
    }
    model.meshes.push({ id: `opea:${object.id}`, label: object.id, layer: "objects", vertices, triangles });
  }
  model.notices.push("A topografia conecta somente amostras da rodada; o terreno não é extrapolado até os limites das superfícies.");
  if (valid.length !== result.points.length) model.notices.push("Há pontos sem coordenadas ou cota de terreno; eles não podem ser posicionados no 3D.");
  if (model.terrain.length > 5000) model.notices.push("Topografia exibida como nuvem de pontos para preservar todas as amostras e a fluidez da navegação.");
  appendVisualTerrain(model, (run.inputSnapshot as { visualTerrain3d?: unknown })?.visualTerrain3d, project);
  return model;
}

function buildHeliportModel(model: TechnicalModel, snapshot: HeliportAnalysisRunSnapshot): TechnicalModel {
  if (snapshot.consolidation.inputFingerprint !== model.fingerprint) {
    model.notices.push("Os dados não correspondem à rodada selecionada."); return model;
  }
  const { hrp } = snapshot;
  if (!finite(hrp.latitude) || !finite(hrp.longitude) || !finite(hrp.elevationM)) {
    model.notices.push("A referência do heliponto não possui coordenadas e altitude completas."); return model;
  }
  const project = localModelProjection(hrp.latitude, hrp.longitude, hrp.elevationM);
  model.datum = snapshot.analysis?.study.verticalDatum ?? "Não informado";
  appendEquipment(model, snapshot.context3d, project);
  const terrain = snapshot.terrainBase?.terrainModel;
  if (terrain) {
    model.terrainSource = snapshot.terrainBase!.sourceFileName;
    model.terrain = terrain.samples.map((p) => project(p.latitude, p.longitude, p.elevationM));
    if (terrain.verticalDatum !== model.datum) {
      model.terrain = [];
      model.notices.push("A referência vertical da topografia difere da rodada. Confira as referências antes de sobrepor o terreno.");
    } else {
      model.meshes.push({ id: "terrain", label: "Topografia", layer: "terrain", vertices: model.terrain, triangles: triangulateModelPoints(model.terrain) });
      model.notices.push("O relevo conecta as amostras topográficas da rodada; as faces entre amostras são uma interpolação visual.");
    }
    if (terrain.samplesTruncated) model.notices.push(`Base parcial: ${terrain.samples.length} de ${terrain.availableSampleCount} amostras foram salvas nesta rodada.`);
    if (model.terrain.length > 5000) model.notices.push("Topografia exibida como nuvem de pontos, sem descartar amostras.");
  } else model.notices.push("Esta rodada não possui amostras topográficas. Confirme o terreno e consolide novamente para incluí-lo.");
  for (const surface of snapshot.assessment.result.surface_instances ?? []) {
    for (const section of surface.sections) {
      if (section.status !== "COMPLETE" || !finite(section.start_elevation_m) || !finite(section.end_elevation_m)) continue;
      // Engine ring may contain two extra corners where the maximum width is reached.
      const ring = section.polygon_wgs84.slice(0, -1);
      if (ring.length !== 4 && ring.length !== 6) continue;
      const xy = ring.map((p) => project(p.latitude, p.longitude, 0));
      const end = ring.length === 6 ? 3 : 2;
      const startCenter = { x: (xy[0].x + xy[1].x) / 2, z: (xy[0].z + xy[1].z) / 2 };
      const dx = (xy[end].x + xy[end + 1].x) / 2 - startCenter.x;
      const dz = (xy[end].z + xy[end + 1].z) / 2 - startCenter.z;
      const denominator = dx * dx + dz * dz;
      if (!denominator) continue;
      const vertices = ring.map((p, i) => {
        const fraction = i < 2 ? 0 : i === end || i === end + 1 ? 1
          : Math.max(0, Math.min(1, ((xy[i].x - startCenter.x) * dx + (xy[i].z - startCenter.z) * dz) / denominator));
        return project(p.latitude, p.longitude, section.start_elevation_m! + fraction * (section.end_elevation_m! - section.start_elevation_m!));
      });
      model.meshes.push({ id: `${surface.surface_instance_id}:${section.section_number}`, label: surface.surface_instance_id,
        layer: "surfaces", surfaceId: surface.surface_instance_id,
        limitingPointCount: (snapshot.assessment.result.evidence_assessments ?? []).filter((p) => p.critical_surface_instance_id === surface.surface_instance_id).length,
        vertices, triangles: triangulateModelPolygon(vertices) });
    }
  }
  for (const assessment of snapshot.assessment.result.evidence_assessments ?? []) {
    const evidence = snapshot.obstacleEvidence.evidence.find((e) => e.evidence_id === assessment.evidence_id && e.revision_number === assessment.revision_number);
    const p = assessment.critical_point_wgs84;
    if (!p || !finite(assessment.top_elevation_m)) continue;
    const base = evidence?.vertical.base_elevation_m;
    model.points.push({ id: assessment.evidence_id, label: evidence?.provenance.source_label ?? assessment.evidence_id,
      position: project(p.latitude, p.longitude, assessment.top_elevation_m),
      base: finite(base) ? project(p.latitude, p.longitude, base) : undefined,
      terrain: finite(base) ? base : undefined, altitude: assessment.top_elevation_m, limit: assessment.surface_limit_elevation_m,
      margin: assessment.margin_m, status: assessment.assessment_status, surface: assessment.critical_surface_instance_id });
  }
  model.points.push({ id: "hrp", label: "Referência do heliponto", position: project(hrp.latitude, hrp.longitude, hrp.elevationM), altitude: hrp.elevationM });
  const b = snapshot.building;
  if (b && finite(b.baseElevationM) && finite(b.heightM) && b.footprint.length >= 3 && b.footprint.every((p) => finite(p.latitude) && finite(p.longitude))) {
    const vertices = b.footprint.map((p) => project(p.latitude!, p.longitude!, b.baseElevationM! + b.heightM!));
    const triangles = triangulateModelPolygon(vertices);
    const count = vertices.length;
    vertices.push(...b.footprint.map((p) => project(p.latitude!, p.longitude!, b.baseElevationM!)));
    for (let i = 0; i < count; i++) { const j = (i + 1) % count; triangles.push(i, j, count + j, i, count + j, count + i); }
    model.meshes.push({ id: "building", label: b.name || "Edificação", layer: "objects", vertices, triangles });
  }
  if (!model.meshes.some((m) => m.layer === "surfaces")) model.notices.push("A rodada não contém superfícies formais completas para posicionar em 3D.");
  return model;
}

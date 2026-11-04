"""Complete display meshes, in the calculation CRS, using the engine's own rules.

This is a tessellation for navigation, not a new assessment. Curved boundaries
are discretized; the original point assessments remain authoritative.
"""
from __future__ import annotations

import math
from pyproj import Transformer
from shapely import LineString, Point
from shapely.ops import nearest_points

from easyaga_engine.coordinates import XY, project_input
from easyaga_engine.engine import (
    _approach_boundary_line, _approach_distance_to_altitude,
    _approach_inner_station, _approach_values, _runway_geometry,
    _station_lateral, _validate_profile_coverage, _xy_from_station_lateral,
)
from easyaga_engine.models import CalculationInput, SurfaceModel, SurfaceModelMesh
from easyaga_engine.norms import get_pbzpa_parameters
from easyaga_engine.profiles import interpolate_elevation, max_elevation_between


def build_surface_model(data: CalculationInput) -> SurfaceModel:
    projected = project_input(data)
    g = _runway_geometry(projected.thresholds[0].xy, projected.thresholds[1].xy, projected.official_strip)
    _validate_profile_coverage(data, g.length_m)
    p = get_pbzpa_parameters(data.runway.operation_type, data.runway.reference_code)
    to_geo = Transformer.from_crs(projected.calculation_crs, "EPSG:4326", always_xy=True)
    horizontal = data.aerodrome.elevation_m + p.horizontal_internal.height_above_aerodrome_m
    meshes: list[SurfaceModelMesh] = []
    profile_start = min(v.station_m for v in data.profile)
    profile_end = max(v.station_m for v in data.profile)

    def profile_station(s):
        # Same 5 cm endpoint tolerance accepted by _validate_profile_coverage.
        if profile_start-0.05 <= s <= profile_end+0.05:
            return min(profile_end, max(profile_start, s))
        return s

    def profile_elevation(s):
        return interpolate_elevation(data.profile, profile_station(s))

    def vertex(s, lateral, elevation):
        xy = _xy_from_station_lateral(g, s, lateral)
        lon, lat = to_geo.transform(xy.x, xy.y)
        return [lat, lon, elevation]

    def add(id, label, rows, layer="surfaces"):
        # Rows of equal width avoid triangulation across holes or opposite sides.
        if any(not row for row in rows):
            chunk = []
            for row in [*rows, []]:
                if row:
                    chunk.append(row)
                else:
                    add(id, label, chunk, layer)
                    chunk = []
            return
        if len(rows) < 2:
            return
        width = len(rows[0])
        vertices = [v for row in rows for v in row]
        faces = []
        for i in range(len(rows)-1):
            for j in range(width-1):
                a = i*width+j
                for triangle in [(a, a+1, a+width), (a+1, a+width+1, a+width)]:
                    u, v, w = [vertices[k] for k in triangle]
                    area = abs((v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0]))
                    # Collapsed rows at the HI intersection are boundaries, not faces.
                    if area > 1e-15:
                        faces.extend(triangle)
        if not faces:
            return
        meshes.append(SurfaceModelMesh(id=id, label=label, layer=layer,
                                       vertices=vertices, triangles=faces))

    def stations(start, end, breaks=(), step=10):
        count = max(1, math.ceil((end-start)/step))
        return sorted({start, end, *(start+(end-start)*i/count for i in range(1, count)),
                       *(s for s in breaks if start < s < end)})

    def transition_rows(axis_samples, edge_at, altitude_at, side):
        rows = []
        for s in axis_samples:
            edge = edge_at(s, side)
            if edge is None:
                rows.append([])
                continue
            # Include the exact source boundary, then solve the intersection with HI.
            base = altitude_at(s, edge)
            if base > horizontal+1e-7:
                rows.append([])
                continue
            lo, hi = 0.0, max(1.0, (horizontal-min(v.elevation_m for v in data.profile))/p.transition_gradient*4)
            for _ in range(45):
                mid = (lo+hi)/2
                if altitude_at(s, edge+side*mid) <= horizontal:
                    lo = mid
                else:
                    hi = mid
            rows.append([vertex(s, edge+side*lo*i/8, altitude_at(s, edge+side*lo*i/8)) for i in range(9)])
        return rows

    profile_breaks = [v.station_m for v in data.profile]
    ordered_profile = sorted(data.profile, key=lambda v: v.station_m)
    for a, b in zip(ordered_profile, ordered_profile[1:]):
        if (a.elevation_m-horizontal)*(b.elevation_m-horizontal) < 0:
            profile_breaks.append(a.station_m+(b.station_m-a.station_m)*(horizontal-a.elevation_m)/(b.elevation_m-a.elevation_m))
    start, end = -data.runway.strip_length_before_threshold_m, g.length_m+data.runway.strip_length_after_threshold_m
    if g.official_strip:
        ref = g.official_strip
        start, end = ref.station_start_m, ref.station_end_m
        profile_breaks += [_station_lateral(g, XY(x, y)).station_m for x, y in ref.polygon.exterior.coords]

        def strip_edge(s, side):
            # Cross-section of the actual official polygon, including rotated ends.
            a, b = _xy_from_station_lateral(g, s, -100000), _xy_from_station_lateral(g, s, 100000)
            section = ref.polygon.intersection(LineString([(a.x, a.y), (b.x, b.y)]))
            if section.is_empty:
                # Floating-point roundoff at the extreme station only.
                s = min(end-1e-7, max(start+1e-7, s))
                a, b = _xy_from_station_lateral(g, s, -100000), _xy_from_station_lateral(g, s, 100000)
                section = ref.polygon.intersection(LineString([(a.x, a.y), (b.x, b.y)]))
            parts = list(section.geoms) if hasattr(section, "geoms") else [section]
            values = [_station_lateral(g, XY(x, y)).lateral_m for part in parts for x, y in part.coords]
            return (max(values) if side > 0 else min(values)) if values else None

        def strip_altitude(s, lateral):
            xy = _xy_from_station_lateral(g, s, lateral)
            shape = Point(xy.x, xy.y)
            base, _ = nearest_points(ref.lateral_edges, shape)
            station = _station_lateral(g, XY(base.x, base.y)).station_m
            return profile_elevation(station)+shape.distance(ref.lateral_edges)*p.transition_gradient
    else:
        def strip_edge(s, side):
            return side*data.runway.strip_width_m/2

        def strip_altitude(s, lateral):
            return profile_elevation(s)+(abs(lateral)-data.runway.strip_width_m/2)*p.transition_gradient

    samples = stations(start, end, profile_breaks)
    # The displayed strip shares the exact boundary/profile/projection with its transition.
    strip_rows = []
    for s in samples:
        left, right = strip_edge(s, -1), strip_edge(s, 1)
        if left is not None and right is not None:
            strip_rows.append([vertex(s, left, strip_altitude(s, left)), vertex(s, right, strip_altitude(s, right))])
    add("runway-strip", "Faixa da pista", strip_rows, "runway")
    for side in [-1, 1]:
        add("TRANSICAO_FAIXA", "Transição da faixa", transition_rows(samples, strip_edge, strip_altitude, side))

    for index, threshold in enumerate(data.runway.thresholds):
        direction = -1 if index == 0 else 1
        inner = _approach_inner_station(g, index, p.approach)
        first = p.approach.first_section
        breaks = sorted({0, first.length_m, first.length_m+(p.approach.second_length_m or 0), p.approach.total_length_m})
        rows = []
        for d in breaks:
            altitude, half = _approach_values(p.approach, threshold.elevation_m, d)
            rows.append([vertex(inner+direction*d, -half, altitude), vertex(inner+direction*d, half, altitude)])
        add(f"APROXIMACAO_{threshold.id}", f"Aproximação {threshold.id}", rows)
        transition_end = _approach_distance_to_altitude(p.approach, threshold.elevation_m, horizontal)
        if transition_end > 0:
            for side in [-1, 1]:
                boundary = _approach_boundary_line(g, index, inner, side, p.approach, threshold.elevation_m, transition_end)

                def approach_edge(s, side):
                    d = max(0, min(transition_end, (s-inner)*direction))
                    return side*_approach_values(p.approach, threshold.elevation_m, d)[1]

                def approach_altitude(s, lateral):
                    xy = _xy_from_station_lateral(g, s, lateral)
                    shape = Point(xy.x, xy.y)
                    nearest = boundary.interpolate(boundary.project(shape))
                    station = _station_lateral(g, XY(nearest.x, nearest.y)).station_m
                    d = max(0, min(transition_end, (station-inner)*direction))
                    return _approach_values(p.approach, threshold.elevation_m, d)[0]+shape.distance(boundary)*p.transition_gradient

                distances = stations(0, transition_end, breaks)
                add(f"TRANSICAO_APROXIMACAO_{threshold.id}", f"Transição da aproximação {threshold.id}",
                    transition_rows([inner+direction*d for d in distances], approach_edge, approach_altitude, side))
        takeoff = p.takeoff
        offset = max(takeoff.distance_from_opposite_threshold_m, data.runway.clearway_length_m)
        takeoff_inner = g.length_m+offset if index == 0 else -offset
        base = max_elevation_between(data.profile, profile_station(g.length_m if index == 0 else 0), profile_station(takeoff_inner))
        capped = (takeoff.final_width_m-takeoff.inner_width_m)/(2*takeoff.opening_each_side_percent)
        rows = []
        for d in sorted({0, min(takeoff.length_m, capped), takeoff.length_m}):
            half = min(takeoff.final_width_m/2, takeoff.inner_width_m/2+takeoff.opening_each_side_percent*d)
            rows.append([vertex(takeoff_inner-direction*d, side*half, base+d*takeoff.gradient) for side in [-1, 1]])
        add(f"DECOLAGEM_{threshold.id}", f"Decolagem {threshold.id}", rows)

    # Capsule outline: two semicircles joined along the runway (not a circle at ARP).
    def capsule(radius, altitude):
        return [vertex(center+radius*math.cos(angle), radius*math.sin(angle), altitude)
                for center, offset in [(g.length_m, -math.pi/2), (0, math.pi/2)]
                for angle in [offset+i*math.pi/96 for i in range(97)]]

    radius = p.horizontal_internal.radius_m
    ring = capsule(radius, horizontal)
    meshes.append(SurfaceModelMesh(id="HORIZONTAL_INTERNA", label="Horizontal interna", vertices=ring,
                                  triangles=[v for i in range(1, len(ring)-1) for v in [0, i, i+1]]))
    outer = capsule(radius+p.conical.height_m/p.conical.gradient, horizontal+p.conical.height_m)
    add("CONICA", "Cônica", [[ring[i%len(ring)], outer[i%len(ring)]] for i in range(len(ring)+1)])
    return SurfaceModel(calculation_crs=projected.calculation_crs, vertical_datum=data.study.vertical_datum, meshes=meshes)

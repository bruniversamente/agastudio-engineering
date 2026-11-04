from __future__ import annotations

import math
from dataclasses import dataclass

from pyproj import CRS, Geod, Transformer

from easyaga_engine.coordinates import XY, select_local_utm_epsg
from easyaga_engine.models import (
    HeliportInput,
    HeliportObstacle,
    HeliportObstacleResult,
    HeliportObstacleSurfaceEvaluation,
    HeliportOutput,
    HeliportSurfaceResult,
    HeliportSurfaceSpec,
)


@dataclass(frozen=True)
class HeliportProjection:
    calculation_crs: str
    transformer: Transformer
    hrp: XY


@dataclass(frozen=True)
class SurfaceAxis:
    unit_x: float
    unit_y: float
    normal_x: float
    normal_y: float


def calculate_heliport(data: HeliportInput) -> HeliportOutput:
    projection = _project_heliport(data)
    surface_results = [_surface_result(surface) for surface in data.surfaces]
    obstacle_results = [
        _calculate_obstacle(data, projection, obstacle)
        for obstacle in data.obstacles
    ]

    return HeliportOutput(
        study_name=data.study.name,
        heliport_name=data.heliport.name,
        input_crs=data.study.horizontal_crs,
        calculation_crs=projection.calculation_crs,
        vertical_datum=data.study.vertical_datum,
        heliport=data.heliport,
        surfaces=surface_results,
        obstacles=obstacle_results,
    )


def _project_heliport(data: HeliportInput) -> HeliportProjection:
    target_crs = select_local_utm_epsg(
        data.heliport.hrp_latitude,
        data.heliport.hrp_longitude,
    )
    transformer = Transformer.from_crs(
        CRS.from_user_input(data.study.horizontal_crs),
        CRS.from_user_input(target_crs),
        always_xy=True,
    )
    hrp_x, hrp_y = transformer.transform(
        data.heliport.hrp_longitude,
        data.heliport.hrp_latitude,
    )
    return HeliportProjection(
        calculation_crs=target_crs,
        transformer=transformer,
        hrp=XY(float(hrp_x), float(hrp_y)),
    )


def _surface_result(surface: HeliportSurfaceSpec) -> HeliportSurfaceResult:
    return HeliportSurfaceResult(
        surface_id=surface.surface_id,
        surface_name=surface.surface_name,
        surface_type=surface.surface_type,
        bearing_deg=surface.bearing_deg,
        inner_width_m=surface.inner_width_m,
        outer_width_m=surface.outer_width_m,
        length_m=surface.length_m,
        gradient_percent=surface.gradient_percent,
        inner_edge_elevation_m=surface.inner_edge_elevation_m,
    )


def _calculate_obstacle(
    data: HeliportInput,
    projection: HeliportProjection,
    obstacle: HeliportObstacle,
) -> HeliportObstacleResult:
    x, y = projection.transformer.transform(obstacle.longitude, obstacle.latitude)
    obstacle_xy = XY(float(x), float(y))
    evaluations = [
        _evaluate_surface(data, projection, surface, obstacle_xy)
        for surface in data.surfaces
    ]
    applicable = [
        evaluation
        for evaluation in evaluations
        if evaluation.status == "APPLICABLE" and evaluation.altitude_limit_m is not None
    ]
    top_altitude = obstacle.base_elevation_m + obstacle.height_m
    if not applicable:
        return HeliportObstacleResult(
            obstacle_id=obstacle.id,
            status="FORA_DO_ESCOPO",
            critical_surface_id=None,
            altitude_limit_m=None,
            max_height_m=None,
            base_elevation_m=round(obstacle.base_elevation_m, 3),
            height_m=round(obstacle.height_m, 3),
            top_altitude_m=round(top_altitude, 3),
            margin_m=None,
            penetration_m=0.0,
            surfaces=evaluations,
            warnings=["Nenhuma superficie PBZPH aplicavel ao obstaculo."],
        )

    critical = min(applicable, key=lambda item: item.altitude_limit_m or float("inf"))
    altitude_limit = float(critical.altitude_limit_m)
    margin = altitude_limit - top_altitude
    penetration = max(0.0, -margin)
    if margin < 0:
        status = "PENETRANTE"
    elif margin < data.study.critical_margin_m:
        status = "CRITICO"
    else:
        status = "VIAVEL"

    return HeliportObstacleResult(
        obstacle_id=obstacle.id,
        status=status,
        critical_surface_id=critical.surface_id,
        altitude_limit_m=round(altitude_limit, 3),
        max_height_m=round(altitude_limit - obstacle.base_elevation_m, 3),
        base_elevation_m=round(obstacle.base_elevation_m, 3),
        height_m=round(obstacle.height_m, 3),
        top_altitude_m=round(top_altitude, 3),
        margin_m=round(margin, 3),
        penetration_m=round(penetration, 3),
        surfaces=evaluations,
    )


def _evaluate_surface(
    data: HeliportInput,
    projection: HeliportProjection,
    surface: HeliportSurfaceSpec,
    obstacle_xy: XY,
) -> HeliportObstacleSurfaceEvaluation:
    axis = _surface_axis(data, projection, surface)
    rel_x = obstacle_xy.x - projection.hrp.x
    rel_y = obstacle_xy.y - projection.hrp.y
    distance = rel_x * axis.unit_x + rel_y * axis.unit_y
    lateral = rel_x * axis.normal_x + rel_y * axis.normal_y
    lateral_abs = abs(lateral)

    if distance < 0 or distance > surface.length_m:
        return _surface_not_applicable(
            surface,
            "obstaculo fora do comprimento da superficie",
            distance_from_inner_edge_m=round(distance, 3),
        )

    half_width = surface.inner_width_m / 2.0 + (surface.opening_each_side_percent / 100.0) * distance
    if surface.outer_width_m is not None:
        half_width = min(half_width, surface.outer_width_m / 2.0)
    if lateral_abs > half_width:
        return _surface_not_applicable(
            surface,
            "obstaculo fora das laterais da superficie",
            distance_from_inner_edge_m=round(distance, 3),
            lateral_distance_m=round(lateral_abs, 3),
            half_width_m=round(half_width, 3),
        )

    altitude = surface.inner_edge_elevation_m + distance * (surface.gradient_percent / 100.0)
    return HeliportObstacleSurfaceEvaluation(
        surface_id=surface.surface_id,
        surface_name=surface.surface_name,
        status="APPLICABLE",
        altitude_limit_m=round(altitude, 3),
        details={
            "distance_from_inner_edge_m": round(distance, 3),
            "lateral_distance_m": round(lateral_abs, 3),
            "half_width_m": round(half_width, 3),
        },
    )


def _surface_axis(
    data: HeliportInput,
    projection: HeliportProjection,
    surface: HeliportSurfaceSpec,
) -> SurfaceAxis:
    geod = Geod(ellps="WGS84")
    effective_bearing = surface.bearing_deg
    if surface.surface_type == "APROXIMACAO":
        effective_bearing = (surface.bearing_deg + 180.0) % 360.0
    destination_lon, destination_lat, _ = geod.fwd(
        data.heliport.hrp_longitude,
        data.heliport.hrp_latitude,
        effective_bearing,
        min(1000.0, surface.length_m),
    )
    dest_x, dest_y = projection.transformer.transform(destination_lon, destination_lat)
    dx = float(dest_x) - projection.hrp.x
    dy = float(dest_y) - projection.hrp.y
    length = math.hypot(dx, dy)
    if length <= 0:
        raise ValueError("nao foi possivel determinar o eixo da superficie PBZPH")
    unit_x = dx / length
    unit_y = dy / length
    return SurfaceAxis(
        unit_x=unit_x,
        unit_y=unit_y,
        normal_x=-unit_y,
        normal_y=unit_x,
    )


def _surface_not_applicable(
    surface: HeliportSurfaceSpec,
    reason: str,
    **details: float | str,
) -> HeliportObstacleSurfaceEvaluation:
    return HeliportObstacleSurfaceEvaluation(
        surface_id=surface.surface_id,
        surface_name=surface.surface_name,
        status="NOT_APPLICABLE",
        reason=reason,
        details=details,
    )

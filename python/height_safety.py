"""EasyAGA design allowance, applied once after the normative calculation.

This is not a regulatory surface, survey tolerance or assertion about DECEA.
Always pass the raw final limit, never a previously adopted limit.
"""
from decimal import Decimal, ROUND_FLOOR
import math

SAFETY_ALLOWANCE_M = 0.10


def adopted_limit(value: float | None) -> float | None:
    if value is None:
        return None
    if not math.isfinite(value):
        raise ValueError("O limite final deve ser finito.")
    return float(Decimal(str(value)) - Decimal("0.10"))


def conservative_display(value: float | None, precision: int = 2) -> str:
    """Display only: never round a maximum upward; calculations stay unrounded."""
    if value is None:
        return "—"
    quantum = Decimal(1).scaleb(-precision)
    return format(Decimal(str(value)).quantize(quantum, rounding=ROUND_FLOOR), f".{precision}f").replace(".", ",")

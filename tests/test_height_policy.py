import sys,unittest,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'python'))
from height_safety import adopted_limit,conservative_display

class HeightPolicyTests(unittest.TestCase):
    def test_allowance_applied_once(self): self.assertEqual(adopted_limit(49.116),49.016)
    def test_missing_limit_remains_missing(self): self.assertIsNone(adopted_limit(None))
    def test_display_truncates_without_rounding_up(self): self.assertEqual(conservative_display(22.119), '22,11')
    def test_display_preserves_negative_direction(self): self.assertEqual(conservative_display(-0.001), '-0,01')
    def test_unknown_display_is_not_zero(self): self.assertEqual(conservative_display(None), '—')
    def test_infinite_limit_is_rejected(self):
        with self.assertRaises(ValueError): adopted_limit(math.inf)
    def test_nan_limit_is_rejected(self):
        with self.assertRaises(ValueError): adopted_limit(math.nan)
    def test_calculation_preserves_more_than_display_precision(self): self.assertEqual(adopted_limit(25.123456),25.023456)

if __name__=='__main__': unittest.main(verbosity=2)

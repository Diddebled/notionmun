import unittest
from main import MotionHandler, ROOT


class StaticPathTests(unittest.TestCase):
    def resolve(self, path):
        return MotionHandler.translate_path(None, path)

    def test_routes_use_the_built_app(self):
        self.assertEqual(self.resolve("/resolutions"), str(ROOT / "dist" / "index.html"))

    def test_traversal_cannot_read_sources(self):
        for path in ("/../main.py", "/%2e%2e/main.py", "/legacy/../main.py", "/legacy/%2e%2e/main.py", "/.env", "/.git/config"):
            with self.subTest(path=path):
                self.assertEqual(self.resolve(path), str(ROOT / "__not_found__"))

    def test_legacy_ui_stays_accessible(self):
        self.assertEqual(self.resolve("/legacy/"), str(ROOT / "legacy" / "index.html"))


if __name__ == "__main__":
    unittest.main()

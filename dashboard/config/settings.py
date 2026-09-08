"""
Django settings — Bare Brilliant inventory dashboard.

A single-purpose Django-admin app: staff edit products in SQLite, then two
buttons regenerate the storefront's static storage tree (catalog.json + per
product JSON + responsive webp/mp4/webm media) and push it to local disk or S3.

Almost everything below is overridable from `dashboard/.env` (loaded via
python-dotenv) so the same code runs against local storage in dev and an S3 +
CDN bucket in production.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BASE_DIR.parent  # barebrilliant/

load_dotenv(BASE_DIR / ".env")


def _env_bool(key: str, default: bool) -> bool:
    return os.environ.get(key, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _env_list(key: str, default: str) -> list[str]:
    return [s.strip() for s in os.environ.get(key, default).split(",") if s.strip()]


# --------------------------------------------------------------------- core ----

SECRET_KEY = os.environ.get(
    "SECRET_KEY",
    "django-insecure-(4@fm!uo8^8f4soux%vk54anh*l4k7j+fz11w7e+4!hjbs)52^",
)
DEBUG = _env_bool("DEBUG", True)
ALLOWED_HOSTS = _env_list("ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0,[::1]")
CSRF_TRUSTED_ORIGINS = _env_list(
    "CSRF_TRUSTED_ORIGINS", "http://localhost:8001,http://127.0.0.1:8001"
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "adminsortable2",
    "taggit",
    "inventory",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    # No login: transparently authenticate every request as the singleton
    # staff user so the stock admin site is reachable with zero clicks.
    # DEBUG-gated — flip DEBUG off (or drop this line) to restore real auth.
    "inventory.middleware.AutoLoginMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.environ.get("SQLITE_PATH", BASE_DIR / "db.sqlite3"),
    }
}

AUTH_PASSWORD_VALIDATORS = []  # single internal staff user, no public signup

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.environ.get("TIME_ZONE", "Asia/Kolkata")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# dashboard/media/ is a local mirror of the deployed storage/ tree:
#
#   media/products_raw_media/<id>/…   uploaded originals (RAW_MEDIA_DIR, never served)
#   media/products_media/<id>/…       generated webp/mp4/webm rungs (MEDIA_DIR)
#   media/products/<id>.json          generated product payloads (PRODUCT_JSON_DIR)
#   media/catalog/catalog.json        generated catalog (CATALOG_JSON_PATH)
#   media/product_placeholder.webp
#
# EXPORT_BACKEND=local writes the generated files straight here (see below); S3
# mode pushes everything except products_raw_media/. All of media/ is gitignored.
MEDIA_URL = "media/"
MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", BASE_DIR / "media"))

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# The auto-login staff user (created on first request / import).
DASHBOARD_USER = os.environ.get("DASHBOARD_USER", "staff")

# --------------------------------------------------------------- publishing ----

# Paths RELATIVE to the publish root — identical to storefront/src/lib/storage.js
# expectations. Product JSON is keyed by the product id (the `slug` field, the
# same token the storefront takes from its URL), i.e. products/<id>.json.
CATALOG_JSON_PATH = "catalog/catalog.json"
PRODUCT_JSON_DIR = "products"
MEDIA_DIR = "products_media"          # generated renditions
RAW_MEDIA_DIR = "products_raw_media"  # uploaded originals (under MEDIA_ROOT, not published)
PLACEHOLDER_NAME = "product_placeholder.webp"

CURRENCY = os.environ.get("CURRENCY", "INR")

# Catalog facets. shape/style lists are recomputed from published products at
# publish time; the numeric bands + sort keys are fixed here (moved verbatim
# from storefront/scripts/gen-sample-catalog.mjs).
SHAPES = ["Round", "Oval", "Emerald", "Pear", "Marquise", "Cushion", "Radiant"]
STYLES = ["Solitaire", "Hidden Halo", "Halo", "Three Stone", "Side Stone", "Bezel", "Contemporary"]
BUDGET_BANDS = [
    {"label": "Under ₹1L", "min": 0, "max": 99999},
    {"label": "₹1L – ₹1.5L", "min": 100000, "max": 150000},
    {"label": "₹1.5L – ₹2L", "min": 150001, "max": 200000},
    {"label": "₹2L & above", "min": 200001, "max": 99999999},
]
CARAT_BANDS = [
    {"label": "Under 0.70 ct", "min": 0, "max": 0.69},
    {"label": "0.70 – 0.89 ct", "min": 0.7, "max": 0.89},
    {"label": "0.90 – 1.09 ct", "min": 0.9, "max": 1.09},
    {"label": "1.10 ct & above", "min": 1.1, "max": 99},
]
CATALOG_SORTS = ["recommended", "newest", "price-asc", "price-desc"]

# --------------------------------------------------------------- media rungs ---

# (width, height) rungs. Source photography is square (1:1); ImageOps.fit covers.
IMG_SRCSET = [(320, 320), (480, 480), (640, 640), (960, 960), (1080, 1080)]
IMAGE_QUALITY = 80
IMAGE_FORMAT = "webp"

VIDEO_SRCSET = [(320, 320), (480, 480), (640, 640), (960, 960), (1080, 1080)]
VIDEO_FORMATS = ["mp4", "webm"]  # mp4 = H.264/AAC (universal), webm = AV1/Opus
VIDEO_H264_CRF = int(os.environ.get("VIDEO_H264_CRF", 23))
VIDEO_AV1_CRF = int(os.environ.get("VIDEO_AV1_CRF", 34))
VIDEO_AV1_PRESET = int(os.environ.get("VIDEO_AV1_PRESET", 6))  # libsvtav1 0..13, lower = slower/smaller

FFMPEG_BIN = os.environ.get("FFMPEG_BIN", "ffmpeg")
FFPROBE_BIN = os.environ.get("FFPROBE_BIN", "ffprobe")

# `sizes` attributes baked into the JSON (storefront layout: square media,
# card column ~352px, PDP stage ~560px).
CARD_SIZES = os.environ.get("CARD_SIZES", "(max-width:460px) 100vw, (max-width:860px) 50vw, 352px")
PDP_SIZES = os.environ.get("PDP_SIZES", "(max-width:900px) 100vw, 560px")

# --------------------------------------------------------------- export dest ---

# "local" -> FileSystemStorage at EXPORT_LOCAL_ROOT. Defaults to MEDIA_ROOT so the
#            generated files land in the dashboard/media/ mirror alongside the
#            uploaded originals. Point it at ../storefront/public/storage to feed
#            `yarn dev` directly instead.
# "s3"    -> storages.backends.s3.S3Storage with the AWS_* values below.
EXPORT_BACKEND = os.environ.get("EXPORT_BACKEND", "local").strip().lower()
EXPORT_LOCAL_ROOT = Path(os.environ.get("EXPORT_LOCAL_ROOT", MEDIA_ROOT))

AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME", "")
AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME", "")
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
AWS_S3_ENDPOINT_URL = os.environ.get("AWS_S3_ENDPOINT_URL", "") or None
AWS_S3_CUSTOM_DOMAIN = os.environ.get("AWS_S3_CUSTOM_DOMAIN", "") or None  # CDN host
AWS_LOCATION = os.environ.get("AWS_LOCATION", "").strip("/")  # key prefix inside the bucket
AWS_QUERYSTRING_AUTH = False
AWS_S3_FILE_OVERWRITE = True
AWS_DEFAULT_ACL = os.environ.get("AWS_DEFAULT_ACL", "") or None
AWS_S3_OBJECT_PARAMETERS = {"CacheControl": os.environ.get("EXPORT_CACHE_CONTROL", "public, max-age=300")}

#!/usr/bin/env python3
"""Push newly changed files from the dashboard's published storage tree.

Source: ``dashboard/media/`` (what ``manage.py refresh_inventory`` /
``publish_changes`` write locally — catalog.json, products/*.json, media
renditions). ``products_raw_media/`` (uploaded originals) is never pushed,
same as the docker `storage` service already blocks it.

Destination is picked from ``dashboard/.env``:
  - AWS_STORAGE_BUCKET_NAME + AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY set
    -> push to that S3 bucket under AWS_STORAGE_BUCKET_FOLDER (or AWS_LOCATION),
       keeping the same relative folder structure as keys.
  - otherwise -> copy into a local folder (default: storefront/public/storage,
    same tree the storefront reads by default), also mirroring the structure.

"Newly changed" = the file's sha256 differs from what the last run pushed,
tracked in a small local state file (--state-file). Use --full to ignore that
and push everything; --dry-run to see what would move without moving it.

Usage:
    tools/push_storage.py                  # incremental push
    tools/push_storage.py --full           # push everything, ignore state
    tools/push_storage.py --dry-run        # show what would be pushed
    tools/push_storage.py --source dashboard/media --local-dest storefront/public/storage
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import shutil
import sys
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parent.parent
EXCLUDED_DIR_NAMES = {"products_raw_media"}

mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("video/webm", ".webm")


def load_env() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        print("note: python-dotenv not installed, reading process env only", file=sys.stderr)
        return
    load_dotenv(REPO_DIR / "dashboard" / ".env")


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def iter_source_files(source: Path):
    """Yield (relative_posix_path, absolute_path) under source, deepest-first exclusions applied."""
    for dirpath, dirnames, filenames in os.walk(source):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDED_DIR_NAMES and not d.startswith(".")]
        for name in filenames:
            if name.startswith("."):
                continue
            abs_path = Path(dirpath) / name
            rel = abs_path.relative_to(source).as_posix()
            yield rel, abs_path


def load_state(state_file: Path) -> dict:
    if not state_file.exists():
        return {}
    try:
        return json.loads(state_file.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def save_state(state_file: Path, state: dict) -> None:
    state_file.parent.mkdir(parents=True, exist_ok=True)
    tmp = state_file.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2, sort_keys=True))
    tmp.replace(state_file)


def s3_configured() -> bool:
    return all(
        os.environ.get(k, "").strip()
        for k in ("AWS_STORAGE_BUCKET_NAME", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY")
    )


def make_s3_client():
    try:
        import boto3
    except ImportError:
        sys.exit("boto3 is required to push to S3 — pip install boto3 (or run inside dashboard/.venv)")
    return boto3.client(
        "s3",
        region_name=os.environ.get("AWS_S3_REGION_NAME") or None,
        endpoint_url=os.environ.get("AWS_S3_ENDPOINT_URL") or None,
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def s3_prefix() -> str:
    folder = os.environ.get("AWS_STORAGE_BUCKET_FOLDER", "").strip("/")
    if folder:
        return folder
    return os.environ.get("AWS_LOCATION", "").strip("/")


def push_to_s3(changed: list[tuple[str, Path]], *, dry_run: bool) -> list[str]:
    bucket = os.environ["AWS_STORAGE_BUCKET_NAME"]
    prefix = s3_prefix()
    cache_control = os.environ.get("EXPORT_CACHE_CONTROL", "public, max-age=300")
    client = None if dry_run else make_s3_client()
    pushed = []
    for rel, abs_path in changed:
        key = f"{prefix}/{rel}" if prefix else rel
        print(f"  s3://{bucket}/{key}")
        if dry_run:
            pushed.append(rel)
            continue
        content_type, _ = mimetypes.guess_type(rel)
        extra_args = {"CacheControl": cache_control}
        if content_type:
            extra_args["ContentType"] = content_type
        try:
            client.upload_file(str(abs_path), bucket, key, ExtraArgs=extra_args)
            pushed.append(rel)
        except Exception as exc:  # noqa: BLE001 - report and keep going
            print(f"  ! failed: {rel}: {exc}", file=sys.stderr)
    return pushed


def push_to_local(changed: list[tuple[str, Path]], dest_root: Path, *, dry_run: bool) -> list[str]:
    pushed = []
    for rel, abs_path in changed:
        dest = dest_root / rel
        print(f"  {dest}")
        if dry_run:
            pushed.append(rel)
            continue
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(abs_path, dest)
            pushed.append(rel)
        except OSError as exc:
            print(f"  ! failed: {rel}: {exc}", file=sys.stderr)
    return pushed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--source",
        default=os.environ.get("EXPORT_LOCAL_ROOT") or os.environ.get("MEDIA_ROOT") or str(REPO_DIR / "dashboard" / "media"),
        help="local storage tree to push from (default: dashboard/media/)",
    )
    parser.add_argument(
        "--local-dest",
        default=str(REPO_DIR / "storefront" / "public" / "storage"),
        help="fallback destination when S3 isn't configured (default: storefront/public/storage/)",
    )
    parser.add_argument(
        "--state-file",
        default=str(REPO_DIR / "dashboard" / ".push_storage_state.json"),
        help="where change-tracking state is kept between runs",
    )
    parser.add_argument("--full", action="store_true", help="push every file, ignoring previous state")
    parser.add_argument("--dry-run", action="store_true", help="show what would be pushed without pushing")
    args = parser.parse_args()

    load_env()

    source = Path(args.source).resolve()
    if not source.is_dir():
        sys.exit(f"source not found: {source}")

    state_file = Path(args.state_file)
    state = {} if args.full else load_state(state_file)

    files = list(iter_source_files(source))
    changed: list[tuple[str, Path]] = []
    hashes: dict[str, str] = {}
    for rel, abs_path in files:
        digest = sha256_of(abs_path)
        hashes[rel] = digest
        if state.get(rel) != digest:
            changed.append((rel, abs_path))

    use_s3 = s3_configured()
    if use_s3:
        dest_desc = f"s3://{os.environ['AWS_STORAGE_BUCKET_NAME']}/{s3_prefix()}".rstrip("/")
    else:
        dest_desc = str(Path(args.local_dest).resolve())

    print(f"source: {source}")
    print(f"destination: {dest_desc} ({'s3' if use_s3 else 'local'})")
    print(f"{len(files)} file(s) scanned, {len(changed)} changed")

    if not changed:
        return 0

    if use_s3:
        pushed = push_to_s3(changed, dry_run=args.dry_run)
    else:
        pushed = push_to_local(changed, Path(args.local_dest).resolve(), dry_run=args.dry_run)

    if args.dry_run:
        print(f"dry-run: would push {len(pushed)} file(s)")
        return 0

    for rel in pushed:
        state[rel] = hashes[rel]
    save_state(state_file, state)

    failed = len(changed) - len(pushed)
    print(f"pushed {len(pushed)} file(s)" + (f", {failed} failed" if failed else ""))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

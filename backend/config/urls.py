from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from PIL import Image, UnidentifiedImageError
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta, timezone
import easyocr
import numpy as np
import json
import re
import uuid
import hashlib
import secrets

_ocr_reader = None


def _get_ocr_reader() -> easyocr.Reader:
    global _ocr_reader
    if _ocr_reader is None:
        _ocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    return _ocr_reader


BASE_DIR = Path(__file__).resolve().parent.parent
MEDIA_DIR = BASE_DIR / "media" / "uploads"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

STORAGE_FILE = BASE_DIR / "stock_records.json"
AUTH_USERS_FILE = BASE_DIR / "auth_users.json"
AUTH_SESSIONS_FILE = BASE_DIR / "auth_sessions.json"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_json_records(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, list) else []
    except json.JSONDecodeError:
        return []


def _save_json_records(path: Path, items: List[Dict[str, Any]]) -> None:
    path.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()


def _get_bearer_token(request: HttpRequest) -> str:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return ""
    return auth_header[7:].strip()


def _resolve_auth_user(request: HttpRequest) -> Tuple[Optional[Dict[str, Any]], str, List[Dict[str, Any]], List[Dict[str, Any]]]:
    token = _get_bearer_token(request)
    if not token:
        return None, "", [], []

    sessions = _load_json_records(AUTH_SESSIONS_FILE)
    users = _load_json_records(AUTH_USERS_FILE)

    now = datetime.now(timezone.utc)
    valid_sessions: List[Dict[str, Any]] = []
    target_session: Optional[Dict[str, Any]] = None

    for session in sessions:
        expires_raw = session.get("expires_at")
        try:
            expires_at = datetime.fromisoformat(expires_raw)
        except (TypeError, ValueError):
            continue

        if expires_at <= now:
            continue

        valid_sessions.append(session)
        if session.get("token") == token:
            target_session = session

    if len(valid_sessions) != len(sessions):
        _save_json_records(AUTH_SESSIONS_FILE, valid_sessions)

    if target_session is None:
        return None, token, valid_sessions, users

    user = next((u for u in users if u.get("id") == target_session.get("user_id")), None)
    if user is None:
        return None, token, valid_sessions, users

    return user, token, valid_sessions, users


def _load_records() -> List[Dict[str, str]]:
    if not STORAGE_FILE.exists():
        return []

    try:
        return json.loads(STORAGE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def _save_records(records: List[Dict[str, str]]) -> None:
    STORAGE_FILE.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


def _delete_unused_images(records: List[Dict[str, str]]) -> None:
    used_images = {item.get("image_url") for item in records if item.get("image_url")}

    for image_path in MEDIA_DIR.iterdir():
        image_url = f"/media/uploads/{image_path.name}"
        if image_url not in used_images:
            try:
                image_path.unlink(missing_ok=True)
            except OSError:
                pass


def _build_summary(records: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    counter: dict[str, int] = {}
    for item in records:
        name = item.get("stock_name", "Unknown").strip() or "Unknown"
        counter[name] = counter.get(name, 0) + 1
    return [{"name": name, "value": value} for name, value in sorted(counter.items())]


def _extract_stock_names_from_image(image_path: Path) -> List[str]:
    stop_words = {"DRIP", "USD", "US", "THB", "ETF", "DR", "CS", "CO", "INC", "ETF"}
    symbol_pattern = re.compile(r"^[A-Z][A-Z0-9]{0,11}$")

    with Image.open(image_path) as image:
        width, height = image.size
        left_side = image.crop((0, 0, int(width * 0.45), height))
        gray = left_side.convert("L")
        binary = gray.point(lambda p: 255 if p > 100 else 0)

    binary_np = np.array(binary)

    reader = _get_ocr_reader()
    results = reader.readtext(
        binary_np,
        detail=1,
        paragraph=False,
        allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    )

    ordered_symbols: List[str] = []
    for (_bbox, raw_text, confidence) in results:
        text = (raw_text or "").strip().upper()
        if not text:
            continue

        if float(confidence) < 0.4:
            continue

        cleaned = re.sub(r"[^A-Z0-9]", "", text)
        if not cleaned or cleaned.isdigit():
            continue
        if cleaned in stop_words:
            continue
        if not symbol_pattern.match(cleaned):
            continue

        if cleaned not in ordered_symbols:
            ordered_symbols.append(cleaned)

    return ordered_symbols


def health_check(_: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok"})


def get_message(_: HttpRequest) -> JsonResponse:
    return JsonResponse({"message": "Hello from Django backend"})


@csrf_exempt
def echo_text(request: HttpRequest) -> HttpResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    text = payload.get("text", "")
    return JsonResponse({"echo": text})


@csrf_exempt
def upload_stock_image(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    image_file = request.FILES.get("image")

    if image_file is None:
        return JsonResponse({"detail": "image is required"}, status=400)

    extension = Path(image_file.name).suffix.lower()
    allowed = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    if extension not in allowed:
        return JsonResponse({"detail": "Unsupported image type"}, status=400)

    file_name = f"{uuid.uuid4().hex}{extension}"
    file_path = MEDIA_DIR / file_name

    with file_path.open("wb+") as destination:
        for chunk in image_file.chunks():
            destination.write(chunk)

    try:
        symbols = _extract_stock_names_from_image(file_path)
    except UnidentifiedImageError:
        return JsonResponse({"detail": "Invalid image file"}, status=400)

    if not symbols:
        return JsonResponse({"detail": "No stock symbols found in image"}, status=400)

    records = _load_records()
    created_items = []
    for symbol in symbols:
        new_record = {
            "id": uuid.uuid4().hex,
            "stock_name": symbol,
            "image_url": f"/media/uploads/{file_name}",
        }
        records.append(new_record)
        created_items.append(new_record)

    _save_records(records)

    return JsonResponse(
        {
            "items": created_items,
            "extracted": symbols,
            "summary": _build_summary(records),
        }
    )


def list_stock_records(_: HttpRequest) -> JsonResponse:
    records = _load_records()
    return JsonResponse({"items": records, "summary": _build_summary(records)})


@csrf_exempt
def register_user(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    display_name = (payload.get("display_name") or "").strip() or "Investor"

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return JsonResponse({"detail": "Invalid email"}, status=400)
    if len(password) < 6:
        return JsonResponse({"detail": "Password must be at least 6 characters"}, status=400)

    users = _load_json_records(AUTH_USERS_FILE)
    if any((u.get("email") or "").lower() == email for u in users):
        return JsonResponse({"detail": "Email already exists"}, status=409)

    salt = secrets.token_hex(8)
    user = {
        "id": uuid.uuid4().hex,
        "email": email,
        "display_name": display_name,
        "password_salt": salt,
        "password_hash": _hash_password(password, salt),
        "created_at": _utc_now_iso(),
    }

    users.append(user)
    _save_json_records(AUTH_USERS_FILE, users)

    return JsonResponse({"message": "registered"}, status=201)


@csrf_exempt
def login_user(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    users = _load_json_records(AUTH_USERS_FILE)
    user = next((u for u in users if (u.get("email") or "").lower() == email), None)
    if user is None:
        return JsonResponse({"detail": "Invalid credentials"}, status=401)

    salt = user.get("password_salt") or ""
    if _hash_password(password, salt) != (user.get("password_hash") or ""):
        return JsonResponse({"detail": "Invalid credentials"}, status=401)

    sessions = _load_json_records(AUTH_SESSIONS_FILE)
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    sessions.append(
        {
            "token": token,
            "user_id": user.get("id"),
            "expires_at": expires_at,
            "created_at": _utc_now_iso(),
        }
    )
    _save_json_records(AUTH_SESSIONS_FILE, sessions)

    return JsonResponse(
        {
            "token": token,
            "user": {
                "id": user.get("id"),
                "email": user.get("email"),
                "display_name": user.get("display_name"),
            },
        }
    )


def me_user(request: HttpRequest) -> JsonResponse:
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user, _token, _sessions, _users = _resolve_auth_user(request)
    if user is None:
        return JsonResponse({"detail": "Unauthorized"}, status=401)

    return JsonResponse(
        {
            "user": {
                "id": user.get("id"),
                "email": user.get("email"),
                "display_name": user.get("display_name"),
            }
        }
    )


@csrf_exempt
def logout_user(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    user, token, sessions, _users = _resolve_auth_user(request)
    if user is None or not token:
        return JsonResponse({"detail": "Unauthorized"}, status=401)

    next_sessions = [s for s in sessions if s.get("token") != token]
    _save_json_records(AUTH_SESSIONS_FILE, next_sessions)
    return JsonResponse({"message": "logged_out"})


@csrf_exempt
def create_stock_record_manual(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    stock_name = (payload.get("stock_name") or "").strip().upper()
    if not stock_name:
        return JsonResponse({"detail": "stock_name is required"}, status=400)

    if not re.match(r"^[A-Z][A-Z0-9]{0,11}$", stock_name):
        return JsonResponse({"detail": "Invalid stock symbol"}, status=400)

    records = _load_records()
    new_record = {
        "id": uuid.uuid4().hex,
        "stock_name": stock_name,
        "image_url": "",
    }
    records.append(new_record)
    _save_records(records)

    return JsonResponse({"item": new_record, "summary": _build_summary(records)})


@csrf_exempt
def rename_stock_record(request: HttpRequest, record_id: str) -> JsonResponse:
    if request.method != "PATCH":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    new_name = (payload.get("stock_name") or "").strip().upper()
    if not new_name:
        return JsonResponse({"detail": "stock_name is required"}, status=400)

    records = _load_records()
    for record in records:
        if record.get("id") == record_id:
            record["stock_name"] = new_name
            _save_records(records)
            return JsonResponse({"item": record, "summary": _build_summary(records)})

    return JsonResponse({"detail": "Record not found"}, status=404)


@csrf_exempt
def delete_stock_record(request: HttpRequest, record_id: str) -> JsonResponse:
    if request.method != "DELETE":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    records = _load_records()
    target = next((r for r in records if r.get("id") == record_id), None)

    if target is None:
        return JsonResponse({"detail": "Record not found"}, status=404)

    image_url = target.get("image_url", "")
    remaining = [r for r in records if r.get("id") != record_id]

    # Delete the image file only when no other record still references it
    still_used = any(r.get("image_url") == image_url for r in remaining)
    if not still_used and image_url:
        file_name = Path(image_url).name
        image_path = MEDIA_DIR / file_name
        try:
            image_path.unlink(missing_ok=True)
        except OSError:
            pass

    _save_records(remaining)
    return JsonResponse({"summary": _build_summary(remaining)})


@csrf_exempt
def update_stock_group(request: HttpRequest) -> JsonResponse:
    if request.method != "PATCH":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    old_name = (payload.get("old_name") or "").strip().upper()
    new_name = (payload.get("new_name") or "").strip().upper()

    if not old_name or not new_name:
        return JsonResponse({"detail": "old_name and new_name are required"}, status=400)

    records = _load_records()
    matched = 0
    for record in records:
        if (record.get("stock_name") or "").strip().upper() == old_name:
            record["stock_name"] = new_name
            matched += 1

    if matched == 0:
        return JsonResponse({"detail": "Stock group not found"}, status=404)

    _save_records(records)
    return JsonResponse({"summary": _build_summary(records), "updated": matched})


@csrf_exempt
def delete_stock_group(request: HttpRequest) -> JsonResponse:
    if request.method != "DELETE":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    stock_name = (payload.get("stock_name") or "").strip().upper()
    if not stock_name:
        return JsonResponse({"detail": "stock_name is required"}, status=400)

    records = _load_records()
    remaining = [
        record for record in records
        if (record.get("stock_name") or "").strip().upper() != stock_name
    ]

    if len(remaining) == len(records):
        return JsonResponse({"detail": "Stock group not found"}, status=404)

    _delete_unused_images(remaining)
    _save_records(remaining)
    return JsonResponse({"summary": _build_summary(remaining)})


urlpatterns = [
    path("api/health", health_check),
    path("api/auth/register", register_user),
    path("api/auth/login", login_user),
    path("api/auth/me", me_user),
    path("api/auth/logout", logout_user),
    path("api/message", get_message),
    path("api/echo", echo_text),
    path("api/stocks", list_stock_records),
    path("api/stocks/manual", create_stock_record_manual),
    path("api/stocks/group", update_stock_group),
    path("api/stocks/group/delete", delete_stock_group),
    path("api/stocks/upload", upload_stock_image),
    path("api/stocks/<str:record_id>/rename", rename_stock_record),
    path("api/stocks/<str:record_id>/delete", delete_stock_record),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.urls import path, re_path
from django.views.generic import TemplateView
from django.utils import timezone
from django.db import transaction
from django.contrib.auth.hashers import make_password, check_password
from PIL import Image, UnidentifiedImageError
try:
    import easyocr
    _easyocr_available = True
except ImportError:
    _easyocr_available = False
import numpy as np
import re
import uuid
import secrets
import json
from datetime import timedelta
from decimal import Decimal
import traceback
from core.models import (
    User, UserAuthProvider, UserSession,
    UserStock, Scan, ScanItem, ScanChargeLog, Wallet,
    Portfolio, PortfolioHolding, IssueReport, SiteFeature,
    HoldingTransaction,
    ScanStatus, CurrencyCode, PaymentStatus, ProviderType
)

@csrf_exempt
def google_login(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    if not settings.GOOGLE_CLIENT_ID:
        return JsonResponse({"detail": "Google login not configured"}, status=503)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    credential = (data.get("credential") or "").strip()
    if not credential:
        return JsonResponse({"detail": "credential is required"}, status=400)

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        id_info = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception as e:
        return JsonResponse({"detail": f"Invalid Google token: {e}"}, status=401)

    google_sub = id_info.get("sub")
    email = (id_info.get("email") or "").strip().lower()
    name = id_info.get("name") or id_info.get("given_name") or "Investor"
    picture = id_info.get("picture") or ""

    if not google_sub or not email:
        return JsonResponse({"detail": "Incomplete Google profile"}, status=400)

    try:
        auth_provider = UserAuthProvider.objects.select_related("user").get(
            provider=ProviderType.GOOGLE,
            provider_user_id=google_sub,
        )
        user = auth_provider.user
        # update picture if user hasn't set a custom one
        if picture and not user.avatar_url:
            user.avatar_url = picture
            user.save(update_fields=["avatar_url", "updated_at"])
    except UserAuthProvider.DoesNotExist:
        # link to existing email account if present, else create new
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "password_hash": make_password(None),
                "display_name": name,
                "avatar_url": picture or None,
                "status": "active",
            },
        )
        if created:
            Wallet.objects.create(user=user, scan_credits=0)
            Portfolio.objects.create(user=user, name="My Portfolio", is_default=True)
        elif picture and not user.avatar_url:
            user.avatar_url = picture
            user.save(update_fields=["avatar_url", "updated_at"])

        UserAuthProvider.objects.get_or_create(
            provider=ProviderType.GOOGLE,
            provider_user_id=google_sub,
            defaults={"user": user},
        )

    token = secrets.token_urlsafe(48)
    expires_at = timezone.now() + timedelta(days=30)
    UserSession.objects.create(
        user=user,
        refresh_token_hash=token,
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
        ip_address=request.META.get("REMOTE_ADDR", ""),
        expires_at=expires_at,
    )

    return JsonResponse({
        "status": "success",
        "token": token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name or name,
            "role": user.role or "user",
            "avatar_url": user.avatar_url or "",
        },
        "expires_at": expires_at.isoformat(),
    })


# Global OCR reader (lazy load)
_ocr_reader = None

def get_ocr_reader():
    global _ocr_reader
    if not _easyocr_available:
        return None
    if _ocr_reader is None:
        _ocr_reader = easyocr.Reader(
            ['en'],
            gpu=False,
            verbose=False,
            model_storage_directory="C:/easyocr_models"
        )
    return _ocr_reader

def extract_stock_symbols_from_image(image_file) -> list[str]:
    stop_words = {"DRIP", "USD", "US", "THB", "ETF", "DR", "CS", "CO", "INC", "LTD", "CORP", "PLC"}
    symbol_pattern = re.compile(r"^[A-Z][A-Z0-9.-]{1,11}$")

    try:
        with Image.open(image_file) as img:
            w, h = img.size
            left_crop = img.crop((0, 0, int(w * 0.45), h))
            gray = left_crop.convert("L")
            binary = gray.point(lambda p: 255 if p > 100 else 0)
            binary_np = np.array(binary)
    except Exception as e:
        print(f"Image preprocessing error: {e}")
        return []

    reader = get_ocr_reader()
    if reader is None:
        return []
    results = reader.readtext(
        binary_np,
        detail=1,
        paragraph=False,
        allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-",
    )

    symbols = []
    for _, text, conf in results:
        text = (text or "").strip().upper()
        if float(conf or 0) < 0.38:
            continue
        cleaned = re.sub(r"[^A-Z0-9.-]", "", text)
        if not cleaned or cleaned.isdigit() or cleaned in stop_words:
            continue
        if symbol_pattern.match(cleaned) and cleaned not in symbols:
            symbols.append(cleaned)

    return symbols


def get_default_portfolio(user):
    portfolio, _ = Portfolio.objects.get_or_create(
        user=user,
        is_default=True,
        defaults={"name": "My Portfolio", "is_default": True},
    )
    return portfolio


def _build_summary(user):
    portfolio = get_default_portfolio(user)
    stocks = UserStock.objects.filter(user=user, is_active=True).order_by("symbol")
    holdings_map = {
        h.user_stock_id: h
        for h in PortfolioHolding.objects.filter(portfolio=portfolio, user_stock__in=stocks)
    }
    result = []
    for s in stocks:
        h = holdings_map.get(s.id)
        if h and h.quantity > 0 and h.avg_cost > 0:
            value = float(h.quantity * h.avg_cost)
        else:
            value = ScanItem.objects.filter(user_stock=s).count() or 1
        result.append({"name": s.symbol, "value": value})
    return result


@csrf_exempt
def register_user(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    print("Register headers:", dict(request.headers))
    print("Register body raw:", request.body)

    if not request.body:
        return JsonResponse({"detail": "Request body is empty"}, status=400)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError as e:
        print("JSON decode error:", str(e))
        return JsonResponse({"detail": "Invalid JSON format", "error": str(e)}, status=400)
    except UnicodeDecodeError:
        return JsonResponse({"detail": "Invalid encoding (expected UTF-8)"}, status=400)

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    display_name = (data.get("display_name") or "").strip() or "Investor"

    if not email or "@" not in email or "." not in email.split("@")[-1]:
        return JsonResponse({"detail": "Valid email is required"}, status=400)
    if len(password) < 6:
        return JsonResponse({"detail": "Password must be at least 6 characters"}, status=400)

    if User.objects.filter(email=email).exists():
        return JsonResponse({"detail": "Email already registered"}, status=409)

    try:
        user = User.objects.create(
            email=email,
            password_hash=make_password(password),
            display_name=display_name,
            status="active"
        )
        Wallet.objects.create(user=user, scan_credits=0)
        Portfolio.objects.create(user=user, name="My Portfolio", is_default=True)
    except Exception as e:
        print("Database error during registration:", str(e))
        return JsonResponse({"detail": "Server error during registration"}, status=500)

    return JsonResponse({
        "status": "success",
        "message": "Registration successful",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name
        }
    }, status=201)


@csrf_exempt
def login_user(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    print("Login headers:", dict(request.headers))
    print("Login body raw:", request.body)

    if not request.body:
        return JsonResponse({"detail": "Request body is empty"}, status=400)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError as e:
        print("JSON decode error:", str(e))
        return JsonResponse({"detail": "Invalid JSON format", "error": str(e)}, status=400)

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse({"detail": "Invalid credentials"}, status=401)

    if not check_password(password, user.password_hash):
        return JsonResponse({"detail": "Invalid credentials"}, status=401)

    token = secrets.token_urlsafe(48)
    expires_at = timezone.now() + timedelta(days=30)

    UserSession.objects.create(
        user=user,
        refresh_token_hash=token,
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
        ip_address=request.META.get("REMOTE_ADDR", ""),
        expires_at=expires_at
    )

    return JsonResponse({
        "status": "success",
        "token": token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name or "",
            "role": user.role or "user",
            "avatar_url": user.avatar_url or "",
        },
        "expires_at": expires_at.isoformat()
    })


@csrf_exempt
def logout_user(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JsonResponse({"detail": "No token provided"}, status=400)

    token = auth_header.split(" ")[1]

    try:
        session = UserSession.objects.get(refresh_token_hash=token)
        session.delete()
        return JsonResponse({"status": "success", "message": "Logged out"})
    except UserSession.DoesNotExist:
        return JsonResponse({"detail": "Invalid or expired token"}, status=401)


def api_login_required(view_func):
    def wrapper(request, *args, **kwargs):
        auth_header = request.headers.get("Authorization")
        print("auth_header :", auth_header)

        if not auth_header or not auth_header.startswith("Bearer "):
            return JsonResponse(
                {"detail": "Authentication credentials were not provided."},
                status=401
            )

        token = auth_header.split(" ")[1]

        try:
            session = UserSession.objects.select_related("user").get(
                refresh_token_hash=token,
                expires_at__gt=timezone.now()
            )
            request.user = session.user
        except UserSession.DoesNotExist:
            return JsonResponse(
                {"detail": "Invalid or expired token"},
                status=401
            )

        return view_func(request, *args, **kwargs)

    return wrapper


@api_login_required
def get_me(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    return JsonResponse({
        "status": "success",
        "user": {
            "id": str(request.user.id),
            "email": request.user.email,
            "display_name": request.user.display_name or "",
            "role": request.user.role or "user",
            "avatar_url": request.user.avatar_url or "",
        }
    })


@csrf_exempt
@api_login_required
def upload_avatar(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    image_file = request.FILES.get("avatar")
    if not image_file:
        return JsonResponse({"detail": "avatar file is required"}, status=400)

    ext = image_file.name.lower().rsplit(".", 1)[-1]
    if ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        return JsonResponse({"detail": "Allowed formats: jpg, png, webp, gif"}, status=400)

    if image_file.size > 5 * 1024 * 1024:
        return JsonResponse({"detail": "File too large (max 5MB)"}, status=400)

    filename = f"avatars/{request.user.id.hex[:12]}_{uuid.uuid4().hex[:8]}.{ext}"
    saved_path = default_storage.save(filename, image_file)
    avatar_url = default_storage.url(saved_path)

    request.user.avatar_url = avatar_url
    request.user.save(update_fields=["avatar_url", "updated_at"])

    return JsonResponse({
        "status": "success",
        "avatar_url": avatar_url,
    })


@csrf_exempt
@api_login_required
def update_profile(request):
    if request.method != "PATCH":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    display_name = (data.get("display_name") or "").strip()
    if not display_name:
        return JsonResponse({"detail": "display_name is required"}, status=400)
    if len(display_name) > 120:
        return JsonResponse({"detail": "display_name too long (max 120)"}, status=400)

    request.user.display_name = display_name
    request.user.save(update_fields=["display_name", "updated_at"])

    return JsonResponse({
        "status": "success",
        "display_name": request.user.display_name,
    })


@csrf_exempt
@api_login_required
@transaction.atomic
def upload_stock_image(request):
    try:
        print("STEP 1: request received")

        if request.method != "POST":
            return JsonResponse({"detail": "Method not allowed"}, status=405)

        print("STEP 2: checking file")
        image_file = request.FILES.get("image")
        if not image_file:
            return JsonResponse({"detail": "image file is required"}, status=400)

        ext = image_file.name.lower().rsplit(".", 1)[-1]
        allowed_ext = {"jpg", "jpeg", "png", "webp"}
        if ext not in allowed_ext:
            return JsonResponse(
                {"detail": f"Allowed formats: {', '.join(allowed_ext)}"},
                status=400
            )

        print("STEP 3: create scan")
        portfolio = get_default_portfolio(request.user)
        scan = Scan.objects.create(
            user=request.user,
            portfolio=portfolio,
            source_image_url="",
            status=ScanStatus.PROCESSING,
        )

        print("STEP 4: save file")
        filename = f"scan_{scan.id.hex[:12]}_{uuid.uuid4().hex[:8]}.{ext}"
        saved_path = default_storage.save(f"uploads/{filename}", image_file)
        image_url = default_storage.url(saved_path)

        scan.source_image_url = image_url
        scan.save(update_fields=["source_image_url"])

        print("STEP 5: OCR start")
        try:
            symbols = extract_stock_symbols_from_image(
                default_storage.open(saved_path)
            )
            print("OCR RESULT:", symbols)
        except Exception as e:
            print("OCR ERROR:", str(e))
            print(traceback.format_exc())

            scan.status = ScanStatus.FAILED
            scan.error_message = f"OCR error: {str(e)}"
            scan.save(update_fields=["status", "error_message"])

            return JsonResponse({
                "detail": "OCR processing failed",
                "error": str(e)
            }, status=500)

        print("STEP 6: validate symbols")
        if not symbols:
            scan.status = ScanStatus.FAILED
            scan.error_message = "No stock symbols detected"
            scan.save(update_fields=["status", "error_message"])

            return JsonResponse({
                "detail": "No stock symbols found in image"
            }, status=422)

        print("STEP 7: save stocks")
        created_items = []

        for symbol in symbols:
            try:
                user_stock, created = UserStock.objects.get_or_create(
                    user=request.user,
                    symbol=symbol,
                    defaults={"display_name": symbol}
                )

                ScanItem.objects.create(
                    scan=scan,
                    user_stock=user_stock,
                    quantity=Decimal("0"),
                    price=Decimal("0"),
                    currency=CurrencyCode.THB,
                    fx_rate_to_thb=Decimal("1.0"),
                    value_thb=Decimal("0"),
                    source="ocr",
                    confidence=Decimal("0.75"),
                )

                PortfolioHolding.objects.get_or_create(
                    portfolio=portfolio,
                    user_stock=user_stock,
                    defaults={"quantity": 0, "avg_cost": 0, "currency": CurrencyCode.THB},
                )

                created_items.append({
                    "symbol": symbol,
                    "user_stock_id": str(user_stock.id),
                    "is_new": created,
                })

            except Exception as e:
                print(f"ERROR saving symbol {symbol}:", str(e))
                print(traceback.format_exc())

        print("STEP 8: complete scan")
        scan.status = ScanStatus.COMPLETED
        scan.completed_at = timezone.now()
        scan.save(update_fields=["status", "completed_at"])

        return JsonResponse({
            "status": "success",
            "scan_id": str(scan.id),
            "items": created_items,
            "summary": _build_summary(request.user),
            "credits_remaining": 0,
            "message": f"Processed {len(symbols)} symbols successfully"
        })

    except Exception as e:
        print("FATAL ERROR:", str(e))
        print(traceback.format_exc())

        return JsonResponse({
            "detail": "Internal server error",
            "error": str(e)
        }, status=500)


_SEARCH_EXCHANGE_MAP = {
    "NYQ": {"label": "NYSE",      "flag": "🇺🇸"},
    "NMS": {"label": "NASDAQ",    "flag": "🇺🇸"},
    "NGM": {"label": "NASDAQ",    "flag": "🇺🇸"},
    "NCM": {"label": "NASDAQ",    "flag": "🇺🇸"},
    "ASE": {"label": "AMEX",      "flag": "🇺🇸"},
    "PCX": {"label": "NYSE Arca", "flag": "🇺🇸"},
    "BKK": {"label": "SET",       "flag": "🇹🇭"},
    "HKG": {"label": "HKEX",      "flag": "🇭🇰"},
    "SHH": {"label": "SSE",       "flag": "🇨🇳"},
    "SHZ": {"label": "SZSE",      "flag": "🇨🇳"},
    "VNM": {"label": "HOSE",      "flag": "🇻🇳"},
}

@api_login_required
def search_stocks(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    import urllib.request as _req
    import urllib.parse as _parse
    import json as _json

    q = (request.GET.get("q") or "").strip()
    if not q:
        return JsonResponse({"items": []})
    try:
        url = (
            "https://query1.finance.yahoo.com/v1/finance/search"
            f"?q={_parse.quote(q)}&quotesCount=15&newsCount=0&listsCount=0"
        )
        req = _req.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with _req.urlopen(req, timeout=6) as resp:
            data = _json.loads(resp.read().decode())
        items = []
        for quote in data.get("quotes", []):
            if quote.get("quoteType") not in ("EQUITY", "ETF"):
                continue
            exch = quote.get("exchange", "")
            info = _SEARCH_EXCHANGE_MAP.get(exch)
            if not info:
                continue
            items.append({
                "symbol": quote.get("symbol", ""),
                "name": (quote.get("longname") or quote.get("shortname") or "").strip(),
                "exchange": info["label"],
                "flag": info["flag"],
            })
        return JsonResponse({"items": items[:12]})
    except Exception:
        return JsonResponse({"items": []})


@api_login_required
def list_user_stocks(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    portfolio_id = request.GET.get("portfolio_id")
    if portfolio_id:
        try:
            portfolio = Portfolio.objects.get(id=portfolio_id, user=request.user)
        except (Portfolio.DoesNotExist, ValueError):
            return JsonResponse({"detail": "Portfolio not found"}, status=404)
    else:
        portfolio = get_default_portfolio(request.user)

    stocks = UserStock.objects.filter(
        user=request.user, is_active=True, holdings__portfolio=portfolio
    ).distinct().order_by("symbol")
    holdings_map = {
        h.user_stock_id: h
        for h in PortfolioHolding.objects.filter(portfolio=portfolio, user_stock__in=stocks)
    }
    items = []
    for s in stocks:
        h = holdings_map.get(s.id)
        items.append({
            "id": str(s.id),
            "stock_name": s.symbol,
            "image_url": s.logo_url or "",
            "quantity": str(h.quantity) if h else "0",
            "avg_cost": str(h.avg_cost) if h else "0",
            "current_price": str(h.current_price) if (h and h.current_price is not None) else "",
            "target_price": str(h.target_price) if (h and h.target_price is not None) else "",
            "stop_loss": str(h.stop_loss) if (h and h.stop_loss is not None) else "",
            "currency": h.currency if h else CurrencyCode.THB,
            "note": h.note or "" if h else "",
            "sector": s.sector or "",
            "exchange": s.exchange or "",
            "is_watchlist": s.is_watchlist,
            "created_at": s.created_at.isoformat(),
        })
    cash_balance = float(portfolio.cash_balance or 0)
    summary = [
        {
            "name": item["stock_name"],
            "value": float(item["quantity"] or 0) * float(item["avg_cost"] or 0) or 1,
        }
        for item in items
    ]
    return JsonResponse({
        "status": "success",
        "items": items,
        "summary": summary,
        "cash_balance": cash_balance,
        "portfolio_id": str(portfolio.id),
    })


@csrf_exempt
@api_login_required
def add_manual_stock(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    name = (data.get("stock_name") or "").strip().upper()
    if not name:
        return JsonResponse({"detail": "stock_name is required"}, status=400)
    if not re.match(r"^[A-Z][A-Z0-9.-]{0,11}$", name):
        return JsonResponse({"detail": "Invalid stock symbol format"}, status=400)

    user_stock, _ = UserStock.objects.get_or_create(
        user=request.user,
        symbol=name,
        defaults={"display_name": name, "is_active": True}
    )

    portfolio_id = data.get("portfolio_id")
    if portfolio_id:
        try:
            portfolio = Portfolio.objects.get(id=portfolio_id, user=request.user)
        except (Portfolio.DoesNotExist, ValueError):
            portfolio = get_default_portfolio(request.user)
    else:
        portfolio = get_default_portfolio(request.user)
    PortfolioHolding.objects.get_or_create(
        portfolio=portfolio,
        user_stock=user_stock,
        defaults={"quantity": 0, "avg_cost": 0, "currency": CurrencyCode.THB},
    )

    return JsonResponse({
        "status": "success",
        "item": {
            "id": str(user_stock.id),
            "stock_name": user_stock.symbol,
            "image_url": user_stock.logo_url or "",
            "quantity": "0",
            "avg_cost": "0",
            "currency": CurrencyCode.THB,
        },
        "summary": _build_summary(request.user),
    }, status=201)


@csrf_exempt
@api_login_required
def rename_stock(request, stock_id):
    if request.method != "PATCH":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        user_stock = UserStock.objects.get(id=stock_id, user=request.user)
    except (UserStock.DoesNotExist, ValueError):
        return JsonResponse({"detail": "Not found"}, status=404)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    new_name = (data.get("stock_name") or "").strip().upper()
    if not new_name:
        return JsonResponse({"detail": "stock_name is required"}, status=400)

    user_stock.symbol = new_name
    user_stock.display_name = new_name
    user_stock.save(update_fields=["symbol", "display_name"])

    return JsonResponse({
        "status": "success",
        "item": {
            "id": str(user_stock.id),
            "stock_name": user_stock.symbol,
            "image_url": user_stock.logo_url or "",
        },
        "summary": _build_summary(request.user),
    })


@csrf_exempt
@api_login_required
def delete_stock(request, stock_id):
    if request.method != "DELETE":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        user_stock = UserStock.objects.get(id=stock_id, user=request.user)
    except (UserStock.DoesNotExist, ValueError):
        return JsonResponse({"detail": "Not found"}, status=404)

    user_stock.delete()

    return JsonResponse({
        "status": "success",
        "summary": _build_summary(request.user),
    })


@csrf_exempt
@api_login_required
def rename_stock_group(request):
    if request.method != "PATCH":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    old_name = (data.get("old_name") or "").strip().upper()
    new_name = (data.get("new_name") or "").strip().upper()
    if not old_name or not new_name:
        return JsonResponse({"detail": "old_name and new_name are required"}, status=400)

    updated = UserStock.objects.filter(user=request.user, symbol=old_name).update(
        symbol=new_name, display_name=new_name
    )
    if not updated:
        return JsonResponse({"detail": "Stock not found"}, status=404)

    return JsonResponse({
        "status": "success",
        "summary": _build_summary(request.user),
    })


@csrf_exempt
@api_login_required
def delete_stock_group(request):
    if request.method != "DELETE":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    stock_name = (data.get("stock_name") or "").strip().upper()
    if not stock_name:
        return JsonResponse({"detail": "stock_name is required"}, status=400)

    portfolio_id = data.get("portfolio_id")
    if portfolio_id:
        try:
            portfolio = Portfolio.objects.get(id=portfolio_id, user=request.user)
        except (Portfolio.DoesNotExist, ValueError):
            portfolio = get_default_portfolio(request.user)
    else:
        portfolio = get_default_portfolio(request.user)

    # Delete only the holding in this portfolio (cascades transactions)
    PortfolioHolding.objects.filter(
        portfolio=portfolio,
        user_stock__symbol=stock_name,
        user_stock__user=request.user,
    ).delete()

    # Delete the UserStock itself only if no holdings remain in any portfolio
    UserStock.objects.filter(
        user=request.user, symbol=stock_name, holdings__isnull=True
    ).delete()

    return JsonResponse({
        "status": "success",
        "summary": _build_summary(request.user),
    })


@api_login_required
def get_wallet(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    wallet, _ = Wallet.objects.get_or_create(user=request.user, defaults={"scan_credits": 0})
    return JsonResponse({
        "status": "success",
        "credits": wallet.scan_credits,
        "updated_at": wallet.updated_at.isoformat() if wallet.updated_at else None
    })


@api_login_required
def list_scans(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    scans = Scan.objects.filter(user=request.user).order_by("-created_at")[:30]
    return JsonResponse({
        "status": "success",
        "items": [{
            "id": str(s.id),
            "status": s.status,
            "source_image_url": s.source_image_url or "",
            "created_at": s.created_at.isoformat(),
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            "error_message": s.error_message or "",
            "items_count": s.scanitem_set.count(),
        } for s in scans]
    })


@csrf_exempt
@api_login_required
def update_holding(request, stock_id):
    if request.method != "PATCH":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        user_stock = UserStock.objects.get(id=stock_id, user=request.user)
    except (UserStock.DoesNotExist, ValueError):
        return JsonResponse({"detail": "Not found"}, status=404)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    portfolio_id = data.get("portfolio_id")
    if portfolio_id:
        try:
            portfolio = Portfolio.objects.get(id=portfolio_id, user=request.user)
        except (Portfolio.DoesNotExist, ValueError):
            portfolio = get_default_portfolio(request.user)
    else:
        portfolio = get_default_portfolio(request.user)

    holding, _ = PortfolioHolding.objects.get_or_create(
        portfolio=portfolio,
        user_stock=user_stock,
        defaults={"quantity": 0, "avg_cost": 0, "currency": CurrencyCode.THB},
    )

    def _to_decimal(val, default=0):
        try:
            return Decimal(str(val if val not in (None, "", 0) else default))
        except Exception:
            return Decimal(str(default))

    if "quantity" in data:
        holding.quantity = _to_decimal(data["quantity"])
    if "avg_cost" in data:
        holding.avg_cost = _to_decimal(data["avg_cost"])
    if "currency" in data and data["currency"] in (CurrencyCode.THB, CurrencyCode.USD):
        holding.currency = data["currency"]
    if "note" in data:
        holding.note = (data["note"] or "").strip() or None
    if "current_price" in data:
        val = data["current_price"]
        holding.current_price = _to_decimal(val, None) if val not in (None, "", 0) else None
    if "target_price" in data:
        val = data["target_price"]
        holding.target_price = _to_decimal(val, None) if val not in (None, "", 0) else None
    if "stop_loss" in data:
        val = data["stop_loss"]
        holding.stop_loss = _to_decimal(val, None) if val not in (None, "", 0) else None
    holding.save()

    return JsonResponse({
        "status": "success",
        "holding": {
            "stock_id": str(user_stock.id),
            "quantity": str(holding.quantity),
            "avg_cost": str(holding.avg_cost),
            "current_price": str(holding.current_price) if holding.current_price is not None else "",
            "currency": holding.currency,
            "note": holding.note or "",
        },
        "summary": _build_summary(request.user),
    })


@api_login_required
def list_admin_users(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    if request.user.role != "admin":
        return JsonResponse({"detail": "Admin only"}, status=403)

    users = User.objects.order_by("created_at").values(
        "id", "email", "display_name", "role", "status", "created_at"
    )
    return JsonResponse({
        "status": "success",
        "items": [{
            "id": str(u["id"]),
            "email": u["email"],
            "display_name": u["display_name"] or "",
            "role": u["role"] or "user",
            "status": u["status"],
            "created_at": u["created_at"].isoformat(),
            "issue_count": IssueReport.objects.filter(user_id=u["id"]).count(),
        } for u in users]
    })


@csrf_exempt
@api_login_required
def update_admin_user(request, user_id):
    if request.method != "PATCH":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    if request.user.role != "admin":
        return JsonResponse({"detail": "Admin only"}, status=403)

    try:
        target = User.objects.get(id=user_id)
    except (User.DoesNotExist, ValueError):
        return JsonResponse({"detail": "Not found"}, status=404)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    if "role" in data and data["role"] in ("user", "admin"):
        target.role = data["role"]
    if "status" in data and data["status"] in ("active", "suspended"):
        target.status = data["status"]
    target.save(update_fields=["role", "status", "updated_at"])

    return JsonResponse({
        "status": "success",
        "user": {
            "id": str(target.id),
            "role": target.role,
            "status": target.status,
        }
    })


@api_login_required
def get_current_price(request, symbol):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    import time, yfinance as yf

    symbol_upper = symbol.upper().strip()
    currency_hint = request.GET.get("currency", "").upper()
    now = time.time()

    # Return cached price if < 60 seconds old
    cached = _price_cache.get(symbol_upper)
    if cached and (now - cached["ts"]) < 60:
        return JsonResponse({
            "price": cached["price"],
            "symbol": cached["symbol"],
            "currency": cached["currency"],
            "source": "cache",
        })

    symbols_to_try = [symbol_upper]
    if currency_hint == "THB" and "." not in symbol_upper:
        symbols_to_try = [symbol_upper + ".BK", symbol_upper]

    for sym in symbols_to_try:
        try:
            ticker = yf.Ticker(sym)
            fast = ticker.fast_info
            price = fast.last_price
            if price and float(price) > 0:
                result = {
                    "price": round(float(price), 4),
                    "symbol": sym,
                    "currency": getattr(fast, "currency", ""),
                }
                _price_cache[symbol_upper] = {**result, "ts": now}
                return JsonResponse(result)
        except Exception:
            continue

    return JsonResponse({"error": "ไม่พบราคาหุ้น"}, status=404)


@csrf_exempt
@api_login_required
def clear_portfolio(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        data = {}

    portfolio_id = data.get("portfolio_id")
    if portfolio_id:
        try:
            portfolio = Portfolio.objects.get(id=portfolio_id, user=request.user)
        except (Portfolio.DoesNotExist, ValueError):
            portfolio = get_default_portfolio(request.user)
    else:
        portfolio = get_default_portfolio(request.user)

    # Delete holdings in this portfolio (cascades to HoldingTransaction)
    PortfolioHolding.objects.filter(portfolio=portfolio).delete()
    # Delete stocks that now have no holdings in any portfolio
    UserStock.objects.filter(user=request.user, holdings__isnull=True).delete()

    portfolio.cash_balance = 0
    portfolio.save(update_fields=["cash_balance", "updated_at"])

    return JsonResponse({"status": "success", "message": "Portfolio cleared"})


@csrf_exempt
@api_login_required
def update_portfolio_cash(request):
    if request.method != "PATCH":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    portfolio_id = data.get("portfolio_id")
    if portfolio_id:
        try:
            portfolio = Portfolio.objects.get(id=portfolio_id, user=request.user)
        except (Portfolio.DoesNotExist, ValueError):
            portfolio = get_default_portfolio(request.user)
    else:
        portfolio = get_default_portfolio(request.user)

    cash = data.get("cash_balance")
    if cash is not None:
        portfolio.cash_balance = Decimal(str(max(0, float(cash or 0))))
        portfolio.save(update_fields=["cash_balance", "updated_at"])

    return JsonResponse({
        "status": "success",
        "cash_balance": float(portfolio.cash_balance or 0),
    })


@csrf_exempt
@api_login_required
def submit_issue(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    subject = (data.get("subject") or "").strip()
    description = (data.get("description") or "").strip()

    if not subject:
        return JsonResponse({"detail": "Subject is required"}, status=400)
    if not description:
        return JsonResponse({"detail": "Description is required"}, status=400)

    issue = IssueReport.objects.create(
        user=request.user,
        subject=subject,
        description=description,
    )
    return JsonResponse({
        "status": "success",
        "issue": {
            "id": str(issue.id),
            "subject": issue.subject,
            "status": issue.status,
            "created_at": issue.created_at.isoformat(),
        }
    }, status=201)


@api_login_required
def list_issues(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    if request.user.role == "admin":
        qs = IssueReport.objects.select_related("user").order_by("-created_at")[:100]
    else:
        qs = IssueReport.objects.filter(user=request.user).order_by("-created_at")[:50]

    is_admin = request.user.role == "admin"
    return JsonResponse({
        "status": "success",
        "items": [{
            "id": str(issue.id),
            "subject": issue.subject,
            "description": issue.description,
            "status": issue.status,
            "admin_note": issue.admin_note or "",
            "created_at": issue.created_at.isoformat(),
            "updated_at": issue.updated_at.isoformat(),
            "user_email": issue.user.email if is_admin else None,
            "user_display_name": (issue.user.display_name or issue.user.email) if is_admin else None,
        } for issue in qs]
    })


@csrf_exempt
@api_login_required
def update_issue(request, issue_id):
    if request.method != "PATCH":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    if request.user.role != "admin":
        return JsonResponse({"detail": "Admin only"}, status=403)

    try:
        issue = IssueReport.objects.get(id=issue_id)
    except IssueReport.DoesNotExist:
        return JsonResponse({"detail": "Not found"}, status=404)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    valid_statuses = ["open", "in_progress", "resolved"]
    if "status" in data and data["status"] in valid_statuses:
        issue.status = data["status"]
    if "admin_note" in data:
        issue.admin_note = (data["admin_note"] or "").strip() or None
    issue.save()

    return JsonResponse({
        "status": "success",
        "issue": {
            "id": str(issue.id),
            "status": issue.status,
            "admin_note": issue.admin_note or "",
        }
    })


def get_features(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    features = {}
    for f in SiteFeature.objects.all():
        features[f.key] = {"enabled": f.enabled, "message": f.message or ""}
    return JsonResponse({"features": features})


@csrf_exempt
@api_login_required
def update_feature(request, key):
    if request.method != "PATCH":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    if request.user.role != "admin":
        return JsonResponse({"detail": "Forbidden"}, status=403)
    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    feature, _ = SiteFeature.objects.get_or_create(key=key)
    if "enabled" in data:
        feature.enabled = bool(data["enabled"])
    if "message" in data:
        feature.message = data["message"] or ""
    feature.save()
    return JsonResponse({"key": key, "enabled": feature.enabled, "message": feature.message or ""})


@api_login_required
def get_fx_rate(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    import time, urllib.request as _req, json as _json
    now = time.time()
    if _fx_cache["rate"] and (now - _fx_cache["ts"]) < 600:
        return JsonResponse({"rate": _fx_cache["rate"], "pair": "USDTHB", "source": "cache"})

    # Primary: Frankfurter (ECB-based, free, no API key)
    try:
        req = _req.Request(
            "https://api.frankfurter.app/latest?from=USD&to=THB",
            headers={"User-Agent": "Mozilla/5.0"},
        )
        with _req.urlopen(req, timeout=5) as resp:
            data = _json.loads(resp.read().decode())
        rate = float(data["rates"]["THB"])
        if rate > 0:
            _fx_cache["rate"] = round(rate, 4)
            _fx_cache["ts"] = now
            return JsonResponse({"rate": _fx_cache["rate"], "pair": "USDTHB", "source": "frankfurter"})
    except Exception:
        pass

    # Fallback: yfinance
    try:
        import yfinance as yf
        price = yf.Ticker("USDTHB=X").fast_info.last_price
        if price and float(price) > 0:
            _fx_cache["rate"] = round(float(price), 4)
            _fx_cache["ts"] = now
            return JsonResponse({"rate": _fx_cache["rate"], "pair": "USDTHB", "source": "yfinance"})
    except Exception:
        pass

    return JsonResponse({"rate": 36.0, "pair": "USDTHB", "source": "fallback"})


@api_login_required
def get_price_history(request, symbol):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    import yfinance as yf
    period = request.GET.get("period", "1mo")
    if period not in ("1wk", "1mo", "3mo", "6mo", "1y"):
        period = "1mo"

    symbol_upper = symbol.upper().strip()
    currency_hint = request.GET.get("currency", "").upper()
    symbols_to_try = [symbol_upper]
    if currency_hint == "THB" and "." not in symbol_upper:
        symbols_to_try = [symbol_upper + ".BK", symbol_upper]

    for sym in symbols_to_try:
        try:
            ticker = yf.Ticker(sym)
            hist = ticker.history(period=period)
            if hist.empty:
                continue
            data = [
                {
                    "date": str(row.name.date()),
                    "open": round(float(row["Open"]), 4),
                    "high": round(float(row["High"]), 4),
                    "low": round(float(row["Low"]), 4),
                    "close": round(float(row["Close"]), 4),
                    "volume": int(row["Volume"]) if row["Volume"] == row["Volume"] else 0,
                }
                for _, row in hist.iterrows()
            ]
            return JsonResponse({"symbol": sym, "period": period, "data": data})
        except Exception:
            continue
    return JsonResponse({"error": "ไม่พบข้อมูลราคา"}, status=404)


@api_login_required
def list_portfolios(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    portfolios = Portfolio.objects.filter(user=request.user).order_by("-is_default", "name")
    return JsonResponse({
        "status": "success",
        "items": [{
            "id": str(p.id),
            "name": p.name,
            "description": p.description or "",
            "is_default": p.is_default,
            "cash_balance": float(p.cash_balance or 0),
            "created_at": p.created_at.isoformat(),
        } for p in portfolios]
    })


@csrf_exempt
@api_login_required
def create_portfolio(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    name = (data.get("name") or "").strip()
    if not name:
        return JsonResponse({"detail": "name is required"}, status=400)

    if Portfolio.objects.filter(user=request.user, name=name).exists():
        return JsonResponse({"detail": "Portfolio name already exists"}, status=409)

    portfolio = Portfolio.objects.create(
        user=request.user,
        name=name,
        description=(data.get("description") or "").strip() or None,
        is_default=False,
    )
    return JsonResponse({
        "status": "success",
        "portfolio": {
            "id": str(portfolio.id),
            "name": portfolio.name,
            "is_default": portfolio.is_default,
            "cash_balance": 0,
        }
    }, status=201)


@api_login_required
def list_transactions(request, stock_id):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    try:
        user_stock = UserStock.objects.get(id=stock_id, user=request.user)
    except (UserStock.DoesNotExist, ValueError):
        return JsonResponse({"detail": "Not found"}, status=404)

    portfolio_id = request.GET.get("portfolio_id")
    if portfolio_id:
        try:
            portfolio = Portfolio.objects.get(id=portfolio_id, user=request.user)
        except (Portfolio.DoesNotExist, ValueError):
            portfolio = get_default_portfolio(request.user)
    else:
        portfolio = get_default_portfolio(request.user)
    try:
        holding = PortfolioHolding.objects.get(portfolio=portfolio, user_stock=user_stock)
    except PortfolioHolding.DoesNotExist:
        return JsonResponse({"status": "success", "items": []})

    txs = HoldingTransaction.objects.filter(holding=holding).order_by("-tx_date", "-created_at")
    return JsonResponse({
        "status": "success",
        "items": [{
            "id": str(t.id),
            "tx_type": t.tx_type,
            "quantity": str(t.quantity),
            "price": str(t.price),
            "currency": t.currency,
            "note": t.note or "",
            "tx_date": str(t.tx_date),
        } for t in txs]
    })


@csrf_exempt
@api_login_required
def add_transaction(request, stock_id):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    try:
        user_stock = UserStock.objects.get(id=stock_id, user=request.user)
    except (UserStock.DoesNotExist, ValueError):
        return JsonResponse({"detail": "Not found"}, status=404)
    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    tx_type = data.get("tx_type", "buy")
    if tx_type not in ("buy", "sell"):
        return JsonResponse({"detail": "tx_type must be buy or sell"}, status=400)

    qty = data.get("quantity")
    price = data.get("price")
    tx_date = data.get("tx_date")
    if not qty or not price or not tx_date:
        return JsonResponse({"detail": "quantity, price, tx_date required"}, status=400)

    try:
        qty_dec = Decimal(str(qty))
        price_dec = Decimal(str(price))
    except Exception:
        return JsonResponse({"detail": "quantity and price must be valid numbers"}, status=400)

    import re as _re
    if not _re.match(r"^\d{4}-\d{2}-\d{2}$", str(tx_date)):
        return JsonResponse({"detail": "tx_date must be YYYY-MM-DD"}, status=400)

    portfolio = get_default_portfolio(request.user)
    holding, _ = PortfolioHolding.objects.get_or_create(
        portfolio=portfolio,
        user_stock=user_stock,
        defaults={"quantity": 0, "avg_cost": 0, "currency": CurrencyCode.THB},
    )

    tx = HoldingTransaction.objects.create(
        holding=holding,
        user=request.user,
        tx_type=tx_type,
        quantity=qty_dec,
        price=price_dec,
        currency=data.get("currency", CurrencyCode.THB),
        note=(data.get("note") or "").strip() or None,
        tx_date=tx_date,
    )
    return JsonResponse({
        "status": "success",
        "transaction": {
            "id": str(tx.id),
            "tx_type": tx.tx_type,
            "quantity": str(tx.quantity),
            "price": str(tx.price),
            "tx_date": str(tx.tx_date),
        }
    }, status=201)


@csrf_exempt
@api_login_required
def delete_transaction(request, tx_id):
    if request.method != "DELETE":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    try:
        tx = HoldingTransaction.objects.get(id=tx_id, user=request.user)
        tx.delete()
        return JsonResponse({"status": "success"})
    except HoldingTransaction.DoesNotExist:
        return JsonResponse({"detail": "Not found"}, status=404)


@csrf_exempt
@api_login_required
def toggle_watchlist(request, stock_id):
    if request.method != "PATCH":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    try:
        user_stock = UserStock.objects.get(id=stock_id, user=request.user)
    except (UserStock.DoesNotExist, ValueError):
        return JsonResponse({"detail": "Not found"}, status=404)
    user_stock.is_watchlist = not user_stock.is_watchlist
    user_stock.save(update_fields=["is_watchlist"])
    return JsonResponse({"status": "success", "is_watchlist": user_stock.is_watchlist})


_commodity_cache = {"data": None, "ts": 0}
_fx_cache        = {"rate": None, "ts": 0}
_price_cache     = {}   # {symbol_upper: {"price": float, "currency": str, "ts": float}}

@api_login_required
def get_commodities(request):
    import time
    import yfinance as yf
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    now = time.time()
    if _commodity_cache["data"] is not None and (now - _commodity_cache["ts"]) < 300:
        return JsonResponse({"status": "success", "items": _commodity_cache["data"]})
    COMMODITIES = [
        {"symbol": "GC=F", "name": "Gold",      "name_th": "ทอง",           "unit": "USD/oz",    "icon": "🥇"},
        {"symbol": "SI=F", "name": "Silver",     "name_th": "เงิน",           "unit": "USD/oz",    "icon": "🥈"},
        {"symbol": "CL=F", "name": "Crude Oil",  "name_th": "น้ำมันดิบ",      "unit": "USD/bbl",   "icon": "🛢"},
        {"symbol": "HG=F", "name": "Copper",     "name_th": "ทองแดง",         "unit": "USD/lb",    "icon": "🔶"},
        {"symbol": "NG=F", "name": "Nat. Gas",   "name_th": "ก๊าซธรรมชาติ",  "unit": "USD/MMBtu", "icon": "🔥"},
    ]
    results = []
    for c in COMMODITIES:
        try:
            fi = yf.Ticker(c["symbol"]).fast_info
            price = fi.last_price
            prev = fi.previous_close
            if price and prev and float(prev) != 0:
                pct = round((float(price) - float(prev)) / float(prev) * 100, 2)
                results.append({**c, "price": round(float(price), 2), "change_pct": pct})
        except Exception:
            pass
    results.sort(key=lambda x: x["change_pct"], reverse=True)
    _commodity_cache["data"] = results
    _commodity_cache["ts"] = now
    return JsonResponse({"status": "success", "items": results})


# -------------------------------------------------------------------------
# URL patterns  (order matters: specific paths before parameterized ones)
# -------------------------------------------------------------------------
urlpatterns = [
    path("api/health", lambda r: JsonResponse({"status": "ok"}), name="health"),

    # Auth
    path("api/auth/register", register_user, name="register"),
    path("api/auth/login", login_user, name="login"),
    path("api/auth/logout", logout_user, name="logout"),
    path("api/auth/me", get_me, name="me"),
    path("api/auth/google", google_login, name="google_login"),
    path("api/auth/avatar", upload_avatar, name="upload_avatar"),
    path("api/auth/profile", update_profile, name="update_profile"),

    # Stocks — specific paths first, then parameterized
    path("api/stocks/upload", upload_stock_image, name="upload_stock_image"),
    path("api/stocks/manual", add_manual_stock, name="add_manual_stock"),
    path("api/stocks/search", search_stocks, name="search_stocks"),
    path("api/stocks/group/delete", delete_stock_group, name="delete_stock_group"),
    path("api/stocks/group", rename_stock_group, name="rename_stock_group"),
    path("api/stocks/<uuid:stock_id>/rename", rename_stock, name="rename_stock"),
    path("api/stocks/<uuid:stock_id>/delete", delete_stock, name="delete_stock"),
    path("api/stocks", list_user_stocks, name="list_user_stocks"),

    # Holdings
    path("api/holdings/<uuid:stock_id>", update_holding, name="update_holding"),
    path("api/portfolio/clear", clear_portfolio, name="clear_portfolio"),
    path("api/portfolio/cash", update_portfolio_cash, name="update_portfolio_cash"),
    path("api/price/<str:symbol>/history", get_price_history, name="get_price_history"),
    path("api/price/<str:symbol>", get_current_price, name="get_current_price"),
    path("api/fx-rate", get_fx_rate, name="get_fx_rate"),
    path("api/commodities", get_commodities, name="get_commodities"),

    # Portfolios
    path("api/portfolios", list_portfolios, name="list_portfolios"),
    path("api/portfolios/create", create_portfolio, name="create_portfolio"),

    # Transactions
    path("api/transactions/<uuid:stock_id>", list_transactions, name="list_transactions"),
    path("api/transactions/<uuid:stock_id>/add", add_transaction, name="add_transaction"),
    path("api/transactions/delete/<uuid:tx_id>", delete_transaction, name="delete_transaction"),

    # Watchlist
    path("api/stocks/<uuid:stock_id>/watchlist", toggle_watchlist, name="toggle_watchlist"),
    path("api/config/features/<str:key>", update_feature, name="update_feature"),
    path("api/config/features", get_features, name="get_features"),

    # Other
    path("api/wallet", get_wallet, name="get_wallet"),
    path("api/scans", list_scans, name="list_scans"),

    # Issues
    path("api/issues/submit", submit_issue, name="submit_issue"),
    path("api/issues/<uuid:issue_id>", update_issue, name="update_issue"),
    path("api/issues", list_issues, name="list_issues"),

    # Admin
    path("api/admin/users/<uuid:user_id>", update_admin_user, name="update_admin_user"),
    path("api/admin/users", list_admin_users, name="list_admin_users"),

    # React SPA catch-all — must be last
    re_path(r"^(?!api/|static/|media/).*$", TemplateView.as_view(template_name="index.html")),
]

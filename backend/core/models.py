from django.db import models
import uuid


# =========================
# ENUMS (Django Choices)
# =========================

class UserStatus(models.TextChoices):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class UserRole(models.TextChoices):
    USER = "user"
    ADMIN = "admin"


class ProviderType(models.TextChoices):
    EMAIL = "email"
    GOOGLE = "google"
    APPLE = "apple"
    LINE = "line"


class PlanType(models.TextChoices):
    PAY_PER_USE = "pay_per_use"
    PACKAGE = "package"
    SUBSCRIPTION = "subscription"


class PaymentStatus(models.TextChoices):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELED = "canceled"


class PaymentMethod(models.TextChoices):
    PROMPTPAY = "promptpay"
    CARD = "card"
    TRANSFER = "transfer"
    WALLET = "wallet"


class CurrencyCode(models.TextChoices):
    THB = "THB"
    USD = "USD"


class ScanStatus(models.TextChoices):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# =========================
# USERS
# =========================

class User(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    display_name = models.CharField(max_length=120, null=True, blank=True)
    avatar_url = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=UserStatus.choices, default=UserStatus.ACTIVE)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.USER)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class UserAuthProvider(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    provider = models.CharField(max_length=20, choices=ProviderType.choices)
    provider_user_id = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("provider", "provider_user_id")


class UserSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    refresh_token_hash = models.CharField(max_length=255)
    user_agent = models.TextField(null=True, blank=True)
    ip_address = models.CharField(max_length=64, null=True, blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)


# =========================
# PRICING / WALLET / PAYMENT
# =========================

class PricingPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    plan_type = models.CharField(max_length=20, choices=PlanType.choices)
    price_thb = models.DecimalField(max_digits=10, decimal_places=2)
    scans_included = models.IntegerField(default=0)
    duration_days = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Wallet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    scan_credits = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)


class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    pricing_plan = models.ForeignKey(PricingPlan, on_delete=models.SET_NULL, null=True, blank=True)
    amount_thb = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    provider_txn_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


# =========================
# STOCKS
# =========================

class UserStock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    symbol = models.CharField(max_length=20)
    display_name = models.CharField(max_length=120, null=True, blank=True)
    logo_url = models.TextField(null=True, blank=True)
    sector = models.CharField(max_length=60, null=True, blank=True)
    exchange = models.CharField(max_length=20, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_watchlist = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "symbol")


class StockNameEdit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    user_stock = models.ForeignKey(UserStock, on_delete=models.CASCADE)
    old_symbol = models.CharField(max_length=20)
    new_symbol = models.CharField(max_length=20)
    edited_at = models.DateTimeField(auto_now_add=True)


# =========================
# PORTFOLIO
# =========================

class Portfolio(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="portfolios")
    name = models.CharField(max_length=120, default="My Portfolio")
    description = models.TextField(null=True, blank=True)
    is_default = models.BooleanField(default=False)
    cash_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "name")


class PortfolioHolding(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    portfolio = models.ForeignKey(Portfolio, on_delete=models.CASCADE, related_name="holdings")
    user_stock = models.ForeignKey(UserStock, on_delete=models.CASCADE, related_name="holdings")
    quantity = models.DecimalField(max_digits=18, decimal_places=6, default=0)
    avg_cost = models.DecimalField(max_digits=18, decimal_places=6, default=0)
    current_price = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    target_price = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    stop_loss = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    currency = models.CharField(max_length=3, choices=CurrencyCode.choices, default=CurrencyCode.THB)
    note = models.TextField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("portfolio", "user_stock")


# =========================
# SCAN
# =========================

class Scan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    portfolio = models.ForeignKey(
        Portfolio, on_delete=models.SET_NULL, null=True, blank=True, related_name="scans"
    )
    source_image_url = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=ScanStatus.choices, default=ScanStatus.QUEUED)
    ocr_raw_text = models.TextField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    score = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    portfolio_type = models.CharField(max_length=30, null=True, blank=True)
    total_value_thb = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)


class ScanChargeLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scan = models.OneToOneField(Scan, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    charge_model = models.CharField(max_length=30, default="pay_per_scan")
    amount_thb = models.DecimalField(max_digits=10, decimal_places=2, default=20.00)
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True)
    credits_used = models.IntegerField(default=0)
    charged_at = models.DateTimeField(auto_now_add=True)


class ScanItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scan = models.ForeignKey(Scan, on_delete=models.CASCADE)
    user_stock = models.ForeignKey(UserStock, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=18, decimal_places=6, default=0)
    price = models.DecimalField(max_digits=18, decimal_places=6, default=0)
    currency = models.CharField(max_length=3, choices=CurrencyCode.choices, default=CurrencyCode.THB)
    fx_rate_to_thb = models.DecimalField(max_digits=18, decimal_places=6, default=1)
    value_thb = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    source = models.CharField(max_length=30, default="ocr")
    confidence = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["scan", "user_stock"])
        ]


class TransactionType(models.TextChoices):
    BUY = "buy"
    SELL = "sell"


class HoldingTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    holding = models.ForeignKey(PortfolioHolding, on_delete=models.CASCADE, related_name="transactions")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    tx_type = models.CharField(max_length=10, choices=TransactionType.choices, default=TransactionType.BUY)
    quantity = models.DecimalField(max_digits=18, decimal_places=6)
    price = models.DecimalField(max_digits=18, decimal_places=6)
    currency = models.CharField(max_length=3, choices=CurrencyCode.choices, default=CurrencyCode.THB)
    note = models.TextField(null=True, blank=True)
    tx_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)


# =========================
# ISSUES
# =========================

class IssueStatus(models.TextChoices):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class IssueReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="issues")
    subject = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=IssueStatus.choices, default=IssueStatus.OPEN)
    admin_note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


# =========================
# SITE CONFIG
# =========================

class SiteFeature(models.Model):
    key = models.CharField(max_length=100, primary_key=True)
    enabled = models.BooleanField(default=True)
    message = models.TextField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


# =========================
# LEGACY (deprecated — do not use in new code)
# =========================

class StockRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stock_name = models.CharField(max_length=20)
    image_url = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

from django.utils.deprecation import MiddlewareMixin
from core.models import UserSession
from django.utils import timezone

class TokenAuthMiddleware(MiddlewareMixin):
    def process_request(self, request):
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return

        token = auth_header.split(" ")[1]

        try:
            session = UserSession.objects.select_related("user").get(
                refresh_token_hash=token,
                expires_at__gt=timezone.now()
            )
            request.user = session.user   # 🔥 สำคัญ
        except UserSession.DoesNotExist:
            pass
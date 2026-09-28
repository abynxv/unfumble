"""
Security module — JWT validation and authentication dependencies.

HOW SUPABASE AUTH WORKS WITH FASTAPI:
1. The React frontend authenticates the user via Supabase email OTP.
2. After successful OTP verification, Supabase gives the frontend a JWT access token.
3. The frontend sends this JWT in the Authorization header: "Bearer <token>"
4. This module validates that JWT using Supabase's JWT secret.
5. If valid, we extract the user's ID and email from the token payload.
6. If invalid/expired, we return a 401 Unauthorized error.

WHY WE VALIDATE ON THE BACKEND:
Even though Supabase already authenticated the user, the backend must verify the JWT
independently. The frontend could be modified by an attacker, so we can't trust the
frontend's word that a user is authenticated — we must cryptographically verify it.

The get_current_user() dependency is reusable across all protected endpoints.
"""

import logging
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

# HTTPBearer extracts the token from the "Authorization: Bearer <token>" header.
# auto_error=True means it automatically returns 401 if the header is missing.
security_scheme = HTTPBearer(auto_error=True)


class AuthenticatedUser:
    """
    Represents a validated, authenticated user extracted from a Supabase JWT.

    This is NOT an ORM model — it's a lightweight object that holds the user's
    identity information for the duration of a single request.
    """

    def __init__(self, id: str, email: str, raw_token: str) -> None:
        self.id = id          # Supabase user UUID (the 'sub' claim in the JWT)
        self.email = email    # User's email address
        self.raw_token = raw_token  # The original JWT, in case we need it downstream

    def __repr__(self) -> str:
        return f"AuthenticatedUser(id={self.id}, email={self.email})"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    """
    FastAPI dependency that validates the Supabase JWT and returns the authenticated user.

    HOW IT WORKS:
    1. FastAPI automatically extracts the Bearer token via the security_scheme dependency.
    2. We decode and verify the JWT using Supabase's JWT secret.
    3. We extract user ID ('sub') and email from the token payload.
    4. If anything fails, we raise 401 Unauthorized.

    USAGE:
        @router.get("/protected")
        async def protected_route(user: AuthenticatedUser = Depends(get_current_user)):
            return {"user_id": user.id}
    """
    token = credentials.credentials

    try:
        # Decode and verify the JWT.
        # Supabase JWTs use HS256 (HMAC with SHA-256) by default.
        # The JWT secret is shared between Supabase and our backend.
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            # Supabase sets the audience to "authenticated" for logged-in users
            audience="authenticated",
        )
    except JWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user identity from the JWT claims.
    # 'sub' = subject = the Supabase user UUID
    user_id: str | None = payload.get("sub")
    email: str | None = payload.get("email")

    if not user_id or not email:
        logger.warning("JWT payload missing 'sub' or 'email' claim.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthenticatedUser(id=user_id, email=email, raw_token=token)


async def get_current_admin(
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    """
    FastAPI dependency for admin-only endpoints.

    WHY A SEPARATE DEPENDENCY:
    Instead of checking admin status inside every admin route handler,
    we create a reusable dependency. If the user isn't an admin, they
    get a 403 Forbidden before the route handler even runs.

    Admin status is determined by checking the user's email against
    the ADMIN_EMAILS environment variable. This is simple and sufficient
    for a learning project — no complex RBAC tables needed.
    """
    if not settings.is_admin(user.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return user

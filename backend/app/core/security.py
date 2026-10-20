"""
Security module — JWT validation and authentication dependencies.

HOW SUPABASE AUTH WORKS WITH FASTAPI:
1. The React frontend authenticates the user via Supabase email OTP.
2. After successful OTP verification, Supabase gives the frontend a JWT access token.
3. The frontend sends this JWT in the Authorization header: "Bearer <token>"
4. This module validates that JWT using Supabase's public keys (JWKS).
5. If valid, we extract the user's ID and email from the token payload.
6. If invalid/expired, we return a 401 Unauthorized error.

WHY WE VALIDATE ON THE BACKEND:
Even though Supabase already authenticated the user, the backend must verify the JWT
independently. The frontend could be modified by an attacker, so we can't trust the
frontend's word that a user is authenticated — we must cryptographically verify it.

JWT ALGORITHM NOTE:
Newer Supabase projects use ES256 (asymmetric ECDSA) for signing JWTs instead of
the older HS256 (symmetric HMAC). We fetch the public keys from Supabase's JWKS
endpoint so validation works regardless of which algorithm is configured.
If JWKS fails or is unavailable, we fall back to HS256 with the JWT secret.

The get_current_user() dependency is reusable across all protected endpoints.
"""

import logging
import time
from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

# HTTPBearer extracts the token from the "Authorization: Bearer <token>" header.
# auto_error=True means it automatically returns 401 if the header is missing.
security_scheme = HTTPBearer(auto_error=True)

# ─── JWKS Cache ───────────────────────────────────────────────────────
# We cache the JWKS keys so we don't fetch them on every single request.
# Cache refreshes every hour or when a key ID (kid) is not found.
_jwks_cache: dict[str, Any] = {
    "keys": None,
    "fetched_at": 0.0,
}
_JWKS_CACHE_TTL = 3600  # 1 hour


async def _fetch_jwks(supabase_url: str) -> list[dict[str, Any]] | None:
    """
    Fetch JSON Web Key Set from Supabase's well-known JWKS endpoint.

    Supabase exposes public keys at:
        {SUPABASE_URL}/auth/v1/.well-known/jwks.json

    These are the public keys used to verify ES256 JWTs.
    Returns None if the endpoint is unavailable.
    """
    jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(jwks_url)
            response.raise_for_status()
            data = response.json()
            keys = data.get("keys", [])
            logger.info(f"Fetched {len(keys)} JWKS key(s) from Supabase")
            return keys
    except Exception as e:
        logger.warning(f"Failed to fetch JWKS from {jwks_url}: {e}")
        return None


async def _get_jwks(supabase_url: str, force_refresh: bool = False) -> list[dict[str, Any]]:
    """
    Return cached JWKS keys, fetching fresh ones if cache is stale or empty.
    """
    now = time.time()
    if (
        not force_refresh
        and _jwks_cache["keys"] is not None
        and (now - _jwks_cache["fetched_at"]) < _JWKS_CACHE_TTL
    ):
        return _jwks_cache["keys"]

    keys = await _fetch_jwks(supabase_url)
    if keys is not None:
        _jwks_cache["keys"] = keys
        _jwks_cache["fetched_at"] = now
        return keys

    # Return stale cache if fresh fetch failed
    if _jwks_cache["keys"] is not None:
        logger.warning("Using stale JWKS cache after fetch failure")
        return _jwks_cache["keys"]

    return []


def _find_jwk_by_kid(keys: list[dict[str, Any]], kid: str) -> dict[str, Any] | None:
    """Find a JWK matching the given key ID."""
    for key in keys:
        if key.get("kid") == kid:
            return key
    return None


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


async def _decode_jwt_with_jwks(
    token: str, supabase_url: str
) -> dict[str, Any] | None:
    """
    Attempt to decode a JWT using JWKS public keys (ES256).

    Steps:
    1. Peek at the token header to get the algorithm and key ID (kid).
    2. Fetch/use cached JWKS keys.
    3. Find the matching key and validate the token.

    Returns the decoded payload or None if JWKS validation is not applicable.
    """
    try:
        # Peek at the unverified header to get alg and kid
        header = jwt.get_unverified_header(token)
    except JWTError:
        return None

    alg = header.get("alg", "")
    kid = header.get("kid", "")

    # Only use JWKS for asymmetric algorithms (ES256, RS256, etc.)
    if alg in ("HS256", "HS384", "HS512"):
        return None

    if not kid:
        return None

    # Try with cached keys first
    keys = await _get_jwks(supabase_url)
    jwk_key = _find_jwk_by_kid(keys, kid)

    # If kid not found, force refresh (key might have been rotated)
    if jwk_key is None:
        logger.info(f"Key ID '{kid}' not in cache, refreshing JWKS...")
        keys = await _get_jwks(supabase_url, force_refresh=True)
        jwk_key = _find_jwk_by_kid(keys, kid)

    if jwk_key is None:
        logger.warning(f"No JWKS key found for kid='{kid}'")
        return None

    # Validate the token with the matching public key
    payload: dict[str, Any] = jwt.decode(
        token,
        jwk_key,
        algorithms=[alg],
        audience="authenticated",
    )
    return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    """
    FastAPI dependency that validates the Supabase JWT and returns the authenticated user.

    HOW IT WORKS:
    1. FastAPI automatically extracts the Bearer token via the security_scheme dependency.
    2. We first try JWKS-based validation (ES256) — used by newer Supabase projects.
    3. If that's not applicable, we fall back to HS256 with the JWT secret.
    4. We extract user ID ('sub') and email from the token payload.
    5. If anything fails, we raise 401 Unauthorized.

    USAGE:
        @router.get("/protected")
        async def protected_route(user: AuthenticatedUser = Depends(get_current_user)):
            return {"user_id": user.id}
    """
    token = credentials.credentials

    try:
        # Strategy 1: Try JWKS-based validation (ES256 / asymmetric)
        payload = await _decode_jwt_with_jwks(token, settings.supabase_url)

        if payload is None:
            # Strategy 2: Fall back to HS256 with JWT secret (older Supabase projects)
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
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

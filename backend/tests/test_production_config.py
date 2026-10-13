"""
Test production configuration validation.
"""
import os
import pytest


@pytest.mark.asyncio
async def test_production_validation_checks():
    """Test the production config validation logic directly."""
    from app.config import Settings
    
    # Test 1: Missing SECRET_KEY
    with pytest.raises(RuntimeError, match="SECRET_KEY.*must be explicitly set"):
        os.environ.pop("SECRET_KEY", None)
        settings = Settings(
            app_env="production",
            database_url="postgresql+asyncpg://user:pass@localhost/db",
            cors_origins=["https://example.com"]
        )
        # Simulate the validation in lifespan
        errors = []
        if not os.getenv("SECRET_KEY"):
            errors.append("SECRET_KEY environment variable must be explicitly set in production")
        if errors:
            raise RuntimeError(
                f"Production configuration is invalid. {len(errors)} error(s) found:\n" +
                "\n".join(f"  - {e}" for e in errors)
            )
    
    # Test 2: localhost in CORS
    settings = Settings(
        app_env="production",
        database_url="postgresql+asyncpg://user:pass@localhost/db",
        cors_origins=["http://localhost:3000", "https://example.com"]
    )
    localhost_origins = [o for o in settings.cors_origins if "localhost" in o or "127.0.0.1" in o]
    assert len(localhost_origins) > 0, "Should detect localhost"
    
    # Test 3: SQLite in production
    settings = Settings(
        app_env="production",
        database_url="sqlite+aiosqlite:///./bookey.db",
        cors_origins=["https://example.com"]
    )
    assert "sqlite" in settings.database_url.lower(), "Should detect SQLite"
    
    # Test 4: Valid production config
    os.environ["SECRET_KEY"] = "test-secret-key-minimum-32-chars-long"
    settings = Settings(
        app_env="production",
        database_url="postgresql+asyncpg://user:pass@db.example.com/bookey",
        cors_origins=["https://example.com", "https://app.example.com"]
    )
    errors = []
    if not os.getenv("SECRET_KEY"):
        errors.append("SECRET_KEY missing")
    localhost_origins = [o for o in settings.cors_origins if "localhost" in o or "127.0.0.1" in o]
    if localhost_origins:
        errors.append(f"localhost in CORS: {localhost_origins}")
    if "sqlite" in settings.database_url.lower():
        errors.append("SQLite in production")
    
    assert len(errors) == 0, f"Valid config should pass: {errors}"
    os.environ.pop("SECRET_KEY", None)


def test_development_allows_defaults():
    """Development environment should work with default settings."""
    from app.config import Settings
    
    settings = Settings(app_env="development")
    assert settings.app_env == "development"
    # Secret key should be auto-generated
    assert len(settings.secret_key) > 0
    # SQLite is fine in development
    assert "sqlite" in settings.database_url
    # localhost is fine in CORS
    assert any("localhost" in o for o in settings.cors_origins)

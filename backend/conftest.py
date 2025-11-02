"""
Pytest configuration and shared fixtures.

This file is automatically loaded by pytest and provides fixtures
that are available to all test files.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    """
    Fixture that provides a Django REST Framework API client.

    Returns:
        APIClient: An API client for testing endpoints
    """
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user):
    """
    Fixture that provides an authenticated API client.

    Args:
        api_client: The base API client
        user: A user fixture

    Returns:
        APIClient: An authenticated API client
    """
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def user(db):
    """
    Fixture that creates a regular user.

    Args:
        db: Django database fixture

    Returns:
        User: A regular user instance
    """
    return User.objects.create_user(
        email='testuser@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User'
    )


@pytest.fixture
def admin_user(db):
    """
    Fixture that creates an admin user.

    Args:
        db: Django database fixture

    Returns:
        User: An admin user instance
    """
    return User.objects.create_superuser(
        email='admin@example.com',
        password='adminpass123',
        first_name='Admin',
        last_name='User'
    )


@pytest.fixture
def manager_user(db):
    """
    Fixture that creates a manager user.

    Args:
        db: Django database fixture

    Returns:
        User: A manager user instance
    """
    user = User.objects.create_user(
        email='manager@example.com',
        password='managerpass123',
        first_name='Manager',
        last_name='User'
    )
    user.role = 'manager'
    user.save()
    return user


@pytest.fixture
def multiple_users(db):
    """
    Fixture that creates multiple users for testing.

    Args:
        db: Django database fixture

    Returns:
        list: A list of user instances
    """
    users = []
    for i in range(5):
        user = User.objects.create_user(
            email=f'user{i}@example.com',
            password=f'testpass{i}',
            first_name=f'User{i}',
            last_name='Test'
        )
        users.append(user)
    return users


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """
    Automatically enable database access for all tests.

    This fixture is autouse=True, so it runs for every test.
    You can remove this if you prefer to explicitly mark tests with @pytest.mark.django_db
    """
    pass


@pytest.fixture
def settings_override():
    """
    Fixture to temporarily override Django settings in tests.

    Usage:
        def test_something(settings_override):
            with settings_override(DEBUG=False):
                # Test with DEBUG=False
                pass
    """
    from django.test import override_settings
    return override_settings

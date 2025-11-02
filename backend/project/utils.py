"""
Project-wide utility functions.

This module contains helper functions used across the application.
"""
import os
from typing import Any


def get_env_variable(var_name: str, default: Any = None, required: bool = False) -> Any:
    """
    Get an environment variable with optional default and validation.

    Args:
        var_name: Name of the environment variable
        default: Default value if variable is not set
        required: If True, raises ValueError when variable is missing

    Returns:
        The environment variable value or default

    Raises:
        ValueError: If required=True and variable is not set
    """
    value = os.getenv(var_name, default)
    if required and value is None:
        raise ValueError(f"Required environment variable '{var_name}' is not set")
    return value


def str_to_bool(value: str | bool) -> bool:
    """
    Convert string to boolean.

    Args:
        value: String or boolean value

    Returns:
        Boolean representation of the value
    """
    if isinstance(value, bool):
        return value
    return value.lower() in ('true', '1', 'yes', 'on', 't', 'y')


def get_current_environment() -> str:
    """
    Get the current environment name.

    Returns:
        Environment name (development, production, staging, test)
    """
    return get_env_variable('ENVIRONMENT', 'development').lower()


def is_production() -> bool:
    """Check if running in production environment."""
    return get_current_environment() == 'production'


def is_development() -> bool:
    """Check if running in development environment."""
    return get_current_environment() == 'development'


def is_test() -> bool:
    """Check if running in test environment."""
    return get_current_environment() == 'test'

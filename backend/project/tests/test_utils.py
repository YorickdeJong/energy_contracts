"""
Tests for utility functions.
"""
import os
import pytest
from project.utils import (
    get_env_variable,
    str_to_bool,
    get_current_environment,
    is_production,
    is_development,
    is_test,
)


class TestGetEnvVariable:
    """Test get_env_variable function."""

    def test_get_existing_variable(self, monkeypatch):
        """Test getting an existing environment variable."""
        monkeypatch.setenv('TEST_VAR', 'test_value')
        assert get_env_variable('TEST_VAR') == 'test_value'

    def test_get_missing_variable_with_default(self):
        """Test getting a missing variable with default value."""
        result = get_env_variable('NONEXISTENT_VAR', default='default_value')
        assert result == 'default_value'

    def test_get_missing_variable_without_default(self):
        """Test getting a missing variable without default."""
        result = get_env_variable('NONEXISTENT_VAR')
        assert result is None

    def test_get_missing_required_variable(self):
        """Test that required missing variable raises ValueError."""
        with pytest.raises(ValueError, match="Required environment variable"):
            get_env_variable('NONEXISTENT_VAR', required=True)

    def test_get_existing_required_variable(self, monkeypatch):
        """Test getting an existing required variable."""
        monkeypatch.setenv('REQUIRED_VAR', 'value')
        assert get_env_variable('REQUIRED_VAR', required=True) == 'value'


class TestStrToBool:
    """Test str_to_bool function."""

    def test_true_strings(self):
        """Test strings that should convert to True."""
        true_values = ['true', 'True', 'TRUE', '1', 'yes', 'Yes', 'YES', 'on', 'On', 'ON', 't', 'T', 'y', 'Y']
        for value in true_values:
            assert str_to_bool(value) is True

    def test_false_strings(self):
        """Test strings that should convert to False."""
        false_values = ['false', 'False', 'FALSE', '0', 'no', 'No', 'NO', 'off', 'Off', 'OFF', 'f', 'F', 'n', 'N']
        for value in false_values:
            assert str_to_bool(value) is False

    def test_boolean_input(self):
        """Test boolean input returns as-is."""
        assert str_to_bool(True) is True
        assert str_to_bool(False) is False


class TestEnvironmentChecks:
    """Test environment detection functions."""

    def test_get_current_environment_default(self, monkeypatch):
        """Test get_current_environment with no ENVIRONMENT set."""
        monkeypatch.delenv('ENVIRONMENT', raising=False)
        assert get_current_environment() == 'development'

    def test_get_current_environment_custom(self, monkeypatch):
        """Test get_current_environment with ENVIRONMENT set."""
        monkeypatch.setenv('ENVIRONMENT', 'production')
        assert get_current_environment() == 'production'

    def test_is_production(self, monkeypatch):
        """Test is_production function."""
        monkeypatch.setenv('ENVIRONMENT', 'production')
        assert is_production() is True

        monkeypatch.setenv('ENVIRONMENT', 'development')
        assert is_production() is False

    def test_is_development(self, monkeypatch):
        """Test is_development function."""
        monkeypatch.setenv('ENVIRONMENT', 'development')
        assert is_development() is True

        monkeypatch.setenv('ENVIRONMENT', 'production')
        assert is_development() is False

    def test_is_test(self, monkeypatch):
        """Test is_test function."""
        monkeypatch.setenv('ENVIRONMENT', 'test')
        assert is_test() is True

        monkeypatch.setenv('ENVIRONMENT', 'development')
        assert is_test() is False

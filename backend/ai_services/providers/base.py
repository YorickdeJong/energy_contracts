from abc import ABC, abstractmethod
from typing import Dict, Optional


class BaseAIProvider(ABC):
    """Abstract base class for AI providers"""

    @abstractmethod
    def extract_tenant_data(self, file_path: str) -> Dict[str, Optional[str]]:
        """Extract tenant data from tenancy agreement file

        Args:
            file_path: Path to the tenancy agreement file

        Returns:
            {
                'first_name': str or None,
                'last_name': str or None,
                'email': str or None,
                'phone_number': str or None
            }
        """
        pass

    @abstractmethod
    def validate_api_key(self) -> bool:
        """Validate that the API key is configured and valid

        Returns:
            bool: True if API key is valid, False otherwise
        """
        pass

import os
import json
import logging
from typing import Dict, Optional
import google.generativeai as genai
from django.conf import settings
from .base import BaseAIProvider

logger = logging.getLogger(__name__)


class GeminiProvider(BaseAIProvider):
    """Google Gemini AI provider for tenant data extraction"""

    SUPPORTED_MIME_TYPES = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
    }

    EXTRACTION_PROMPT = """Extract tenant information from this tenancy agreement document.
Please identify and return the following information in JSON format:
- first_name: The tenant's first name
- last_name: The tenant's last or family name
- email: The tenant's email address
- phone_number: The tenant's phone number

If any field is not found in the document, return null for that field.
Return ONLY valid JSON, no additional text.

Example response format:
{"first_name": "John", "last_name": "Doe", "email": "john@example.com", "phone_number": "+31612345678"}"""

    def __init__(self):
        """Initialize Gemini provider with API key"""
        self.api_key = os.getenv('GEMINI_API_KEY')
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        else:
            self.model = None

    def validate_api_key(self) -> bool:
        """Validate that the API key is configured and valid"""
        if not self.api_key:
            logger.error("GEMINI_API_KEY not configured in environment")
            return False

        try:
            # Test API key by making a simple request
            genai.configure(api_key=self.api_key)
            list(genai.list_models())
            return True
        except Exception as e:
            logger.error(f"Invalid GEMINI_API_KEY: {str(e)}")
            return False

    def _get_mime_type(self, file_path: str) -> Optional[str]:
        """Get MIME type based on file extension"""
        _, ext = os.path.splitext(file_path.lower())
        return self.SUPPORTED_MIME_TYPES.get(ext)

    def _is_supported_file(self, file_path: str) -> bool:
        """Check if file type is supported"""
        return self._get_mime_type(file_path) is not None

    def extract_tenant_data(self, file_path: str) -> Dict[str, Optional[str]]:
        """Extract tenant data from tenancy agreement file

        Args:
            file_path: Path to the tenancy agreement file

        Returns:
            Dictionary with extracted tenant data

        Raises:
            ValueError: If file type is not supported or API key is invalid
            Exception: If extraction fails
        """
        if not self.validate_api_key():
            raise ValueError("Invalid or missing GEMINI_API_KEY")

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        if not self._is_supported_file(file_path):
            raise ValueError(
                f"Unsupported file type. Supported types: {', '.join(self.SUPPORTED_MIME_TYPES.keys())}"
            )

        try:
            logger.info(f"Uploading file to Gemini: {file_path}")

            # Upload file to Gemini
            uploaded_file = genai.upload_file(file_path)
            logger.info(f"File uploaded successfully: {uploaded_file.name}")

            # Generate content with the uploaded file
            logger.info("Generating content with Gemini model")
            response = self.model.generate_content([uploaded_file, self.EXTRACTION_PROMPT])

            # Parse the response
            response_text = response.text.strip()
            logger.info(f"Gemini response: {response_text}")

            # Try to extract JSON from the response
            # Sometimes the model returns markdown code blocks
            if response_text.startswith('```json'):
                response_text = response_text.split('```json')[1]
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
            if response_text.endswith('```'):
                response_text = response_text.rsplit('```', 1)[0]

            response_text = response_text.strip()

            try:
                extracted_data = json.loads(response_text)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {response_text}")
                raise ValueError(f"Invalid JSON response from AI: {str(e)}")

            # Validate the structure
            result = {
                'first_name': extracted_data.get('first_name'),
                'last_name': extracted_data.get('last_name'),
                'email': extracted_data.get('email'),
                'phone_number': extracted_data.get('phone_number'),
            }

            logger.info(f"Successfully extracted tenant data: {result}")
            return result

        except Exception as e:
            logger.error(f"Error extracting tenant data: {str(e)}")
            raise Exception(f"Failed to extract tenant data: {str(e)}")

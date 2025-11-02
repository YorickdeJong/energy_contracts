"""File converter utility for converting unsupported file types to PDF."""
import os
import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Optional, Tuple
from PIL import Image

logger = logging.getLogger(__name__)


class FileConverter:
    """Converts various file formats to PDF for AI processing."""

    # File extensions that require conversion to PDF
    REQUIRES_CONVERSION = {
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
    }

    def __init__(self):
        self.temp_files = []  # Track temporary files for cleanup

    def needs_conversion(self, file_path: str) -> bool:
        """Check if file needs to be converted to PDF."""
        extension = Path(file_path).suffix.lower()
        return extension in self.REQUIRES_CONVERSION

    def convert_to_pdf(self, input_path: str) -> Optional[str]:
        """
        Convert file to PDF if needed.

        Args:
            input_path: Path to the input file

        Returns:
            Path to PDF file (either converted or original), or None if conversion fails
        """
        if not os.path.exists(input_path):
            logger.error(f"Input file does not exist: {input_path}")
            return None

        extension = Path(input_path).suffix.lower()

        # If already PDF, return original path
        if extension == '.pdf':
            logger.info(f"File is already PDF: {input_path}")
            return input_path

        # Check if conversion is needed
        if not self.needs_conversion(input_path):
            logger.warning(f"Unknown file type, attempting to use as-is: {extension}")
            return input_path

        # Create temp file for output
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            output_path = tmp_file.name
            self.temp_files.append(output_path)

        try:
            # Convert based on file type
            if extension in ['.docx', '.doc']:
                success = self._convert_docx_to_pdf(input_path, output_path)
            elif extension in ['.jpg', '.jpeg', '.png', '.webp']:
                success = self._convert_image_to_pdf(input_path, output_path)
            else:
                logger.error(f"Unsupported file type for conversion: {extension}")
                return None

            if success and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                logger.info(f"Successfully converted {input_path} to PDF: {output_path}")
                return output_path
            else:
                logger.error(f"Conversion failed or produced empty file: {input_path}")
                self._cleanup_file(output_path)
                return None

        except Exception as e:
            logger.error(f"Error converting file {input_path}: {str(e)}")
            self._cleanup_file(output_path)
            return None

    def _convert_docx_to_pdf(self, input_path: str, output_path: str) -> bool:
        """
        Convert DOCX/DOC to PDF using LibreOffice headless mode.

        Args:
            input_path: Path to input DOCX/DOC file
            output_path: Path where PDF should be saved

        Returns:
            True if conversion successful, False otherwise
        """
        try:
            # Create temporary directory for LibreOffice output
            temp_dir = tempfile.mkdtemp()

            # Run LibreOffice in headless mode
            cmd = [
                'libreoffice',
                '--headless',
                '--convert-to', 'pdf',
                '--outdir', temp_dir,
                input_path
            ]

            logger.info(f"Converting DOCX to PDF with LibreOffice: {input_path}")
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60  # 60 second timeout
            )

            if result.returncode != 0:
                logger.error(f"LibreOffice conversion failed: {result.stderr}")
                return False

            # LibreOffice creates a PDF with the same name as input file
            input_filename = Path(input_path).stem
            libreoffice_output = os.path.join(temp_dir, f"{input_filename}.pdf")

            if not os.path.exists(libreoffice_output):
                logger.error(f"LibreOffice did not create expected output file: {libreoffice_output}")
                return False

            # Move the file to desired output location
            os.rename(libreoffice_output, output_path)

            # Cleanup temp directory
            try:
                os.rmdir(temp_dir)
            except:
                pass

            return True

        except subprocess.TimeoutExpired:
            logger.error(f"LibreOffice conversion timed out for {input_path}")
            return False
        except Exception as e:
            logger.error(f"Error in DOCX to PDF conversion: {str(e)}")
            return False

    def _convert_image_to_pdf(self, input_path: str, output_path: str) -> bool:
        """
        Convert image to PDF using Pillow.

        Args:
            input_path: Path to input image file
            output_path: Path where PDF should be saved

        Returns:
            True if conversion successful, False otherwise
        """
        try:
            logger.info(f"Converting image to PDF: {input_path}")

            # Open and convert image
            with Image.open(input_path) as img:
                # Convert to RGB if necessary (PDF doesn't support transparency)
                if img.mode in ('RGBA', 'LA', 'P'):
                    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    rgb_img.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                    img = rgb_img
                elif img.mode != 'RGB':
                    img = img.convert('RGB')

                # Save as PDF
                img.save(output_path, 'PDF', resolution=100.0)

            return True

        except Exception as e:
            logger.error(f"Error in image to PDF conversion: {str(e)}")
            return False

    def _cleanup_file(self, file_path: str):
        """Remove a temporary file."""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                if file_path in self.temp_files:
                    self.temp_files.remove(file_path)
                logger.debug(f"Cleaned up temporary file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to cleanup temporary file {file_path}: {str(e)}")

    def cleanup_all(self):
        """Clean up all temporary files created during conversion."""
        for file_path in self.temp_files[:]:  # Create a copy of the list to iterate
            self._cleanup_file(file_path)
        self.temp_files.clear()

    def __del__(self):
        """Cleanup on deletion."""
        self.cleanup_all()

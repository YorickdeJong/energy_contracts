"""Email utilities for sending user-related emails."""
import logging
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def send_welcome_email(user, temporary_password, landlord_name):
    """
    Send welcome email to a newly created tenant with their temporary password.

    Args:
        user: User object for the new tenant
        temporary_password: The temporary password generated for the user
        landlord_name: Name of the landlord who created the account

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        login_url = f"{settings.FRONTEND_URL}/login"

        context = {
            'user': user,
            'temporary_password': temporary_password,
            'landlord_name': landlord_name,
            'login_url': login_url,
        }

        # Render HTML and text versions
        html_message = render_to_string('emails/welcome_tenant.html', context)
        text_message = render_to_string('emails/welcome_tenant.txt', context)

        # Send email
        send_mail(
            subject='Welcome to Energy Contracts - Your Account Details',
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f"Welcome email sent successfully to {user.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send welcome email to {user.email}: {str(e)}")
        return False


def send_password_changed_email(user):
    """
    Send confirmation email after a user changes their password.

    Args:
        user: User object whose password was changed

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        context = {
            'user': user,
            'changed_at': timezone.now().strftime('%B %d, %Y at %I:%M %p'),
        }

        # Render HTML and text versions
        html_message = render_to_string('emails/password_changed.html', context)
        text_message = render_to_string('emails/password_changed.txt', context)

        # Send email
        send_mail(
            subject='Your Password Has Been Changed',
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f"Password changed confirmation email sent to {user.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send password changed email to {user.email}: {str(e)}")
        return False

# Secrets Management Guide

This document outlines the best practices for managing secrets in the Energy Contracts project across different environments.

## Overview

Secrets should **NEVER** be committed to version control. We use different strategies for different environments:

- **Local Development**: `.env` files
- **CI/CD (GitHub Actions)**: GitHub Secrets
- **Production/Staging**: Azure Key Vault (or your cloud provider's secret manager)

## Local Development

### Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Generate a secure Django secret key:
```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

3. Update `.env` with your actual values:
```env
SECRET_KEY=your-generated-secret-key
DATABASE_PASSWORD=your-local-db-password
```

### Security Notes

- ✅ `.env` is in `.gitignore` - never commit it
- ✅ `.env.example` is committed - contains no real secrets
- ✅ Use strong, unique passwords for local databases
- ⚠️  Never share your `.env` file with anyone

## GitHub Actions (CI/CD)

### Required Secrets

Set these in your GitHub repository settings under **Settings → Secrets and variables → Actions**:

#### For CI/CD Pipeline:
These are already configured in the workflows but use environment-specific defaults:
- `SECRET_KEY` - Django secret key (auto-generated for testing)
- Database credentials are set in the workflow using defaults for testing

#### For Production Deployments (Future):
When you add deployment workflows, you'll need:
- `AZURE_CREDENTIALS` - Azure service principal credentials
- `PRODUCTION_SECRET_KEY` - Django secret key for production
- `PRODUCTION_DATABASE_URL` - Full database connection string
- `ALLOWED_HOSTS` - Comma-separated list of allowed hosts
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed origins

### How to Add Secrets to GitHub

```bash
# Using GitHub CLI
gh secret set SECRET_KEY --body "your-secret-key-here"

# Or via GitHub UI:
# Repository → Settings → Secrets and variables → Actions → New repository secret
```

### Best Practices for CI/CD

1. **Never log secrets**: GitHub automatically masks registered secrets in logs
2. **Use environment-specific secrets**: Different secrets for staging/production
3. **Rotate regularly**: Update secrets periodically (every 90 days recommended)
4. **Minimal permissions**: Only grant necessary access to workflows

## Production Deployment

### Azure Key Vault (Recommended for Azure)

#### Setup Steps

1. **Create Key Vault**:
```bash
az keyvault create \
  --name energy-contracts-vault \
  --resource-group energy-contracts-rg \
  --location westeurope
```

2. **Store Secrets**:
```bash
# Store Django secret key
az keyvault secret set \
  --vault-name energy-contracts-vault \
  --name django-secret-key \
  --value "your-production-secret-key"

# Store database password
az keyvault secret set \
  --vault-name energy-contracts-vault \
  --name database-password \
  --value "your-db-password"
```

3. **Configure App Service to use Key Vault**:

In your App Service Configuration, reference secrets:
```
@Microsoft.KeyVault(SecretUri=https://energy-contracts-vault.vault.azure.net/secrets/django-secret-key/)
```

4. **Grant Access**:
```bash
# Enable managed identity for App Service
az webapp identity assign \
  --name energy-contracts-app \
  --resource-group energy-contracts-rg

# Grant access to Key Vault
az keyvault set-policy \
  --name energy-contracts-vault \
  --object-id <managed-identity-id> \
  --secret-permissions get list
```

### Alternative: AWS Secrets Manager

If deploying to AWS:

```bash
# Create secret
aws secretsmanager create-secret \
  --name energy-contracts/django-secret-key \
  --secret-string "your-production-secret-key"

# Grant access via IAM role attached to ECS/EC2
```

### Alternative: Environment Variables (Less Secure)

For simple deployments, you can use environment variables, but this is less secure:

```bash
# Set in your deployment platform (Heroku, DigitalOcean, etc.)
heroku config:set SECRET_KEY=your-secret-key
```

## Docker & Docker Compose

### Development with Docker Compose

Use the same `.env` file:
```bash
docker-compose up
```

The `docker-compose.yml` reads from `.env` automatically.

### Production Docker Deployment

**DO NOT** build secrets into images. Instead:

1. **Use secrets management in orchestration**:

For Docker Swarm:
```yaml
secrets:
  django_secret_key:
    external: true
```

For Kubernetes:
```yaml
env:
  - name: SECRET_KEY
    valueFrom:
      secretKeyRef:
        name: django-secrets
        key: secret-key
```

2. **Pass environment variables at runtime**:
```bash
docker run -e SECRET_KEY=${SECRET_KEY} your-image
```

## Secret Rotation

### Best Practices

1. **Schedule regular rotations**: Every 90 days for production secrets
2. **Automated rotation**: Use cloud provider's automated rotation features
3. **Update all environments**: When rotating, update all deployment targets

### Rotation Checklist

- [ ] Generate new secret
- [ ] Update in Key Vault / Secrets Manager
- [ ] Update GitHub Actions secrets
- [ ] Update local `.env.example` instructions
- [ ] Deploy updated configuration
- [ ] Verify application still works
- [ ] Remove old secret after grace period

## Common Secrets to Manage

### Django Application

- `SECRET_KEY` - Django cryptographic signing
- `DATABASE_URL` or individual DB credentials
- `ALLOWED_HOSTS` - Security setting
- `CORS_ALLOWED_ORIGINS` - Frontend URLs

### Third-Party Services (Future)

- Email service credentials (SendGrid, Mailgun)
- Cloud storage credentials (AWS S3, Azure Blob)
- Payment gateway keys (Stripe, PayPal)
- OAuth client IDs and secrets
- API keys for external services

## Security Checklist

- [ ] No secrets in git history
- [ ] `.env` files are in `.gitignore`
- [ ] Production uses Key Vault or Secrets Manager
- [ ] GitHub Actions secrets are configured
- [ ] Secrets are rotated regularly
- [ ] Team members use unique local credentials
- [ ] Production secrets are different from staging/dev
- [ ] Least privilege access to secrets
- [ ] Audit logs enabled for secret access

## Emergency Procedures

### If Secrets Are Leaked

1. **Immediately rotate** all affected secrets
2. **Revoke access** for compromised credentials
3. **Audit logs** to determine the extent of exposure
4. **Update** all environments with new secrets
5. **Review** and improve security practices
6. **Consider** notifying affected parties if required by policy/law

### Useful Commands

```bash
# Generate new Django secret key
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Check for accidentally committed secrets (install git-secrets)
git secrets --scan

# Audit git history for secrets (install truffleHog)
truffleHog git file://. --json
```

## Resources

- [Django Security Documentation](https://docs.djangoproject.com/en/stable/topics/security/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

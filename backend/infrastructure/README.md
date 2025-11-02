# Azure Infrastructure Deployment

This directory contains everything needed to deploy the Energy Contracts Django backend to Azure using infrastructure-as-code (Bicep templates).

## Overview

This deployment creates a cost-effective, production-ready infrastructure on Azure with the following managed services:

| Service | Purpose | Cost (approx.) |
|---------|---------|----------------|
| **Azure Database for PostgreSQL Flexible Server** | Database hosting | $12.41/month (Burstable B1ms) |
| **Azure App Service** | Django application hosting | $13.14/month (Basic B1) |
| **Azure Blob Storage** | Media file storage (documents) | $0.18/month (10GB Hot tier) |
| **Azure Key Vault** | Secrets management | $1-2/month |
| **Managed Identity** | Passwordless authentication | Free |
| **TOTAL** | | **~$27-28/month** |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Azure Cloud                             │
│                                                                 │
│  ┌──────────────────┐         ┌─────────────────────┐          │
│  │   App Service    │────────▶│  Azure PostgreSQL   │          │
│  │   (Django)       │         │  Flexible Server    │          │
│  │                  │         │  (Database)         │          │
│  └────────┬─────────┘         └─────────────────────┘          │
│           │                                                     │
│           │                   ┌─────────────────────┐          │
│           ├──────────────────▶│  Azure Blob Storage │          │
│           │                   │  (Media Files)      │          │
│           │                   └─────────────────────┘          │
│           │                                                     │
│           │                   ┌─────────────────────┐          │
│           └──────────────────▶│  Azure Key Vault    │          │
│                               │  (Secrets)          │          │
│                               └─────────────────────┘          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Managed Identity (Passwordless Auth)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Azure Subscription**
   - Sign up at [azure.microsoft.com](https://azure.microsoft.com/)
   - Free trial available ($200 credit)

2. **Azure CLI**
   - Install: [Azure CLI Installation Guide](https://docs.microsoft.com/cli/azure/install-azure-cli)
   - Verify: `az --version`

3. **Azure Account Login**
   ```bash
   az login
   ```

4. **Bash Shell**
   - Linux/macOS: Native bash
   - Windows: Use WSL2 or Git Bash

## Quick Start (5-Minute Deployment)

### Step 1: Prepare Configuration Files

```bash
# Navigate to infrastructure directory
cd backend/infrastructure

# Copy environment template
cp .env.azure.example .env.azure

# Edit .env.azure and fill in required values
# Minimum required:
# - AZURE_SUBSCRIPTION_ID (get from: az account show --query id -o tsv)
# - POSTGRES_ADMIN_PASSWORD (or leave empty for auto-generation)
# - DJANGO_SECRET_KEY (or leave empty for auto-generation)
```

### Step 2: Create Parameters File

```bash
# Copy parameters template
cp parameters.example.json parameters.dev.json

# Edit parameters.dev.json and update:
# - postgresAdminPassword (or use auto-generated from deploy script)
# - djangoSecretKey (or use auto-generated from deploy script)
# - Other settings like environment, location, etc.
```

### Step 3: Deploy

```bash
# Run the deployment script
./deploy.sh
```

That's it! The script will:
- ✅ Check prerequisites
- ✅ Generate secure passwords/secrets (if needed)
- ✅ Create Azure resource group
- ✅ Deploy all infrastructure (5-10 minutes)
- ✅ Configure all connections and security
- ✅ Display next steps

## Detailed Configuration Guide

### Environment Variables (.env.azure)

Create `.env.azure` from the template:

```bash
cp .env.azure.example .env.azure
```

**Required Variables:**

```bash
# Find your subscription ID
AZURE_SUBSCRIPTION_ID=

# Resource group (will be created if doesn't exist)
AZURE_RESOURCE_GROUP=energy-contracts-rg

# Azure region
AZURE_LOCATION=westeurope

# Environment
ENVIRONMENT=dev

# PostgreSQL password (leave empty for auto-generation)
POSTGRES_ADMIN_PASSWORD=

# Django secret key (leave empty for auto-generation)
DJANGO_SECRET_KEY=
```

**Finding Your Subscription ID:**

```bash
# Login to Azure
az login

# List all subscriptions
az account list --output table

# Get current subscription ID
az account show --query id --output tsv
```

### Parameters Files

Create environment-specific parameter files:

```bash
# Development
cp parameters.example.json parameters.dev.json

# Staging (optional)
cp parameters.example.json parameters.staging.json

# Production (optional)
cp parameters.example.json parameters.prod.json
```

**Key Parameters:**

```json
{
  "parameters": {
    "environment": {
      "value": "dev"  // or "staging", "prod"
    },
    "location": {
      "value": "westeurope"  // Azure region
    },
    "postgresSku": {
      "value": "Standard_B1ms"  // Burstable for cost savings
    },
    "appServiceSku": {
      "value": "B1"  // Basic tier
    }
  }
}
```

## Deployment Script (deploy.sh)

The `deploy.sh` script automates the entire deployment process:

### What It Does

1. **Prerequisites Check**
   - Verifies Azure CLI is installed
   - Checks you're logged in to Azure
   - Validates configuration files exist

2. **Secret Generation** (if needed)
   - Generates secure PostgreSQL password
   - Generates Django SECRET_KEY
   - Saves to `.env.azure` for future use

3. **Resource Group Creation**
   - Creates Azure resource group (if doesn't exist)
   - Sets up in specified region

4. **Infrastructure Deployment**
   - Deploys Bicep template
   - Creates all Azure resources
   - Configures security and networking
   - Sets up managed identities

5. **Output Information**
   - Displays all connection strings
   - Shows next steps
   - Saves deployment details to files

### Usage

```bash
# Basic deployment
./deploy.sh

# Check script without running
bash -n deploy.sh
```

### Output Files

After deployment, you'll find:

- `deployment-output.json` - Full Azure deployment output
- `deployment-info.txt` - Human-readable connection info

## Post-Deployment Steps

### 1. Configure GitHub Actions (CI/CD)

```bash
# Connect your GitHub repository to App Service
az webapp deployment source config \
  --name energy-contracts-dev-app \
  --resource-group energy-contracts-rg \
  --repo-url https://github.com/YOUR_USERNAME/energy_contracts \
  --branch main \
  --manual-integration
```

### 2. Run Database Migrations

```bash
# SSH into the App Service
az webapp ssh --name energy-contracts-dev-app --resource-group energy-contracts-rg

# Inside the SSH session:
python manage.py migrate
```

### 3. Create Django Superuser

```bash
# In the SSH session:
python manage.py createsuperuser
```

### 4. Update Frontend Configuration

Update your frontend `.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://energy-contracts-dev-app.azurewebsites.net
```

### 5. Configure CORS

Add your frontend domain to App Service configuration:

```bash
az webapp config appsettings set \
  --name energy-contracts-dev-app \
  --resource-group energy-contracts-rg \
  --settings CORS_ALLOWED_ORIGINS="https://your-frontend-domain.com,https://energy-contracts-dev-app.azurewebsites.net"
```

## Cost Optimization

### Development Environment

**Stop resources when not in use:**

```bash
# Stop PostgreSQL server (only pay for storage)
az postgres flexible-server stop \
  --name energy-contracts-dev-postgres \
  --resource-group energy-contracts-rg

# Start when needed
az postgres flexible-server start \
  --name energy-contracts-dev-postgres \
  --resource-group energy-contracts-rg

# Stop App Service
az webapp stop \
  --name energy-contracts-dev-app \
  --resource-group energy-contracts-rg
```

**Savings:** ~$20/month when stopped during off-hours

### Production Environment

**Use Reserved Capacity:**

```bash
# Purchase 1-year reserved capacity for PostgreSQL
# Savings: 35%
# Purchase 3-year reserved capacity
# Savings: 60%
```

Navigate to: Azure Portal > PostgreSQL > Reserved Capacity

**Expected Production Costs (with optimizations):**

| Scenario | Monthly Cost |
|----------|-------------|
| Development (full-time) | $27-28 |
| Development (stop at night) | $15-18 |
| Production (Basic tier) | $27-28 |
| Production (1yr reserved) | $18-20 |
| Production (3yr reserved) | $12-15 |

### Monitoring Costs

```bash
# View current month costs
az consumption usage list \
  --start-date 2025-01-01 \
  --end-date 2025-01-31 \
  --output table
```

Or in Azure Portal: **Cost Management + Billing**

## Troubleshooting

### Common Issues

#### 1. Azure CLI Not Found

```bash
# Install Azure CLI
# macOS
brew install azure-cli

# Ubuntu/Debian
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Windows
# Download from: https://aka.ms/installazurecliwindows
```

#### 2. Not Logged In

```bash
az login
az account show  # Verify login
```

#### 3. Deployment Fails

```bash
# Check deployment logs
az deployment group show \
  --name <deployment-name> \
  --resource-group energy-contracts-rg

# View detailed error
az deployment group list \
  --resource-group energy-contracts-rg \
  --output table
```

#### 4. Resource Name Conflicts

Azure resource names must be globally unique. If you get naming conflicts:

Edit `parameters.json`:
```json
{
  "projectName": {
    "value": "energy-contracts-yourname"  // Make it unique
  }
}
```

#### 5. Permission Errors

Ensure your Azure account has **Contributor** role:

```bash
# Check your role
az role assignment list --assignee $(az account show --query user.name -o tsv) --output table

# If needed, ask your Azure admin to grant Contributor role
```

### Getting Help

1. **Check Deployment Logs:**
   ```bash
   cat deployment-output.json | jq '.properties.error'
   ```

2. **Azure Portal:**
   - Navigate to Resource Group
   - Check "Deployments" section
   - View error details

3. **Azure CLI Verbose:**
   ```bash
   az deployment group create --debug
   ```

## Security Best Practices

### Secrets Management

- ✅ All secrets stored in Azure Key Vault
- ✅ App Service uses Key Vault references (no secrets in config)
- ✅ Managed Identity for passwordless authentication
- ✅ `.env.azure` in `.gitignore` (never commit secrets)

### Network Security

- ✅ PostgreSQL firewall configured (Azure services only)
- ✅ HTTPS enforced on App Service
- ✅ Storage account has no public blob access
- ✅ TLS 1.2 minimum for all services

### Access Control

- ✅ Azure RBAC enabled on Key Vault
- ✅ Managed Identity has least-privilege access
- ✅ PostgreSQL uses Azure AD authentication

## Updating Infrastructure

To update the infrastructure after initial deployment:

```bash
# Make changes to main.bicep or parameters file

# Re-run deployment (idempotent)
./deploy.sh

# Only changed resources will be updated
```

## Multiple Environments

Deploy separate dev/staging/prod environments:

```bash
# Development
PARAMETERS_FILE=parameters.dev.json ENVIRONMENT=dev ./deploy.sh

# Staging
PARAMETERS_FILE=parameters.staging.json ENVIRONMENT=staging ./deploy.sh

# Production
PARAMETERS_FILE=parameters.prod.json ENVIRONMENT=prod ./deploy.sh
```

## Cleaning Up

To delete all Azure resources:

```bash
# Delete entire resource group (WARNING: irreversible!)
az group delete --name energy-contracts-rg --yes --no-wait

# Check deletion status
az group exists --name energy-contracts-rg
```

## Advanced Topics

### Custom Domain & SSL

```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name energy-contracts-dev-app \
  --resource-group energy-contracts-rg \
  --hostname api.yourdomain.com

# Enable SSL (free managed certificate)
az webapp config ssl bind \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI \
  --name energy-contracts-dev-app \
  --resource-group energy-contracts-rg
```

### Scaling

```bash
# Scale App Service Plan
az appservice plan update \
  --name energy-contracts-dev-plan \
  --resource-group energy-contracts-rg \
  --sku P1V2  # Premium tier

# Scale PostgreSQL
az postgres flexible-server update \
  --name energy-contracts-dev-postgres \
  --resource-group energy-contracts-rg \
  --sku-name Standard_D2s_v3
```

### Monitoring & Logging

```bash
# Enable Application Insights
az monitor app-insights component create \
  --app energy-contracts-insights \
  --location westeurope \
  --resource-group energy-contracts-rg \
  --application-type web

# View logs in real-time
az webapp log tail \
  --name energy-contracts-dev-app \
  --resource-group energy-contracts-rg
```

## Files in This Directory

```
infrastructure/
├── README.md                    # This file
├── main.bicep                   # Main infrastructure template
├── parameters.json              # Default parameters (development)
├── parameters.example.json      # Template for creating parameter files
├── .env.azure.example           # Template for Azure credentials
├── deploy.sh                    # Automated deployment script
├── deployment-output.json       # Generated after deployment (gitignored)
└── deployment-info.txt          # Generated after deployment (gitignored)
```

## Resources & Documentation

- [Azure Bicep Documentation](https://docs.microsoft.com/azure/azure-resource-manager/bicep/)
- [Azure App Service - Django](https://docs.microsoft.com/azure/app-service/quickstart-python)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/azure/postgresql/)
- [Azure Key Vault](https://docs.microsoft.com/azure/key-vault/)
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review Azure deployment logs
3. Consult Azure documentation
4. Open an issue in the project repository

## License

This infrastructure code is part of the Energy Contracts project.

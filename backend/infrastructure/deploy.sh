#!/bin/bash

# =============================================================================
# Azure Infrastructure Deployment Script
# =============================================================================
# This script automates the deployment of Energy Contracts backend to Azure
# using Bicep templates. It handles resource group creation, secret generation,
# and complete infrastructure provisioning.
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# =============================================================================
# Prerequisites Check
# =============================================================================

check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed"
        echo "Install from: https://docs.microsoft.com/cli/azure/install-azure-cli"
        exit 1
    fi
    print_success "Azure CLI is installed"

    # Check Azure CLI version
    AZ_VERSION=$(az version --query '"azure-cli"' -o tsv)
    print_info "Azure CLI version: $AZ_VERSION"

    # Check if logged in to Azure
    if ! az account show &> /dev/null; then
        print_error "Not logged in to Azure"
        echo "Please run: az login"
        exit 1
    fi
    print_success "Logged in to Azure"

    # Check if .env.azure exists
    if [ ! -f .env.azure ]; then
        print_error ".env.azure file not found"
        echo "Please copy .env.azure.example to .env.azure and fill in your values"
        echo "  cp .env.azure.example .env.azure"
        exit 1
    fi
    print_success ".env.azure file found"

    # Check if Python is available for secret generation
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        print_warning "Python not found - cannot auto-generate Django SECRET_KEY"
    else
        print_success "Python is available for secret generation"
    fi
}

# =============================================================================
# Load Configuration
# =============================================================================

load_configuration() {
    print_header "Loading Configuration"

    # Load environment variables from .env.azure
    if [ -f .env.azure ]; then
        export $(grep -v '^#' .env.azure | xargs)
    fi

    # Set defaults if not specified
    AZURE_RESOURCE_GROUP=${AZURE_RESOURCE_GROUP:-"energy-contracts-rg"}
    AZURE_LOCATION=${AZURE_LOCATION:-"westeurope"}
    ENVIRONMENT=${ENVIRONMENT:-"dev"}
    PROJECT_NAME=${PROJECT_NAME:-"energy-contracts"}
    PARAMETERS_FILE=${PARAMETERS_FILE:-"parameters.json"}

    print_info "Subscription: $(az account show --query name -o tsv)"
    print_info "Resource Group: $AZURE_RESOURCE_GROUP"
    print_info "Location: $AZURE_LOCATION"
    print_info "Environment: $ENVIRONMENT"
    print_info "Project: $PROJECT_NAME"
    print_info "Parameters File: $PARAMETERS_FILE"

    # Check if parameters file exists
    if [ ! -f "$PARAMETERS_FILE" ]; then
        print_error "Parameters file not found: $PARAMETERS_FILE"
        echo "Please create it from parameters.example.json"
        exit 1
    fi
    print_success "Parameters file found"
}

# =============================================================================
# Generate Secrets
# =============================================================================

generate_secrets() {
    print_header "Generating Secrets"

    # Generate PostgreSQL password if not set
    if [ -z "$POSTGRES_ADMIN_PASSWORD" ]; then
        print_info "Generating PostgreSQL admin password..."
        POSTGRES_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        print_success "PostgreSQL password generated"

        # Optionally save to .env.azure
        if [ -f .env.azure ]; then
            if grep -q "POSTGRES_ADMIN_PASSWORD=" .env.azure; then
                # Update existing line (macOS compatible)
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s|POSTGRES_ADMIN_PASSWORD=.*|POSTGRES_ADMIN_PASSWORD=$POSTGRES_ADMIN_PASSWORD|" .env.azure
                else
                    sed -i "s|POSTGRES_ADMIN_PASSWORD=.*|POSTGRES_ADMIN_PASSWORD=$POSTGRES_ADMIN_PASSWORD|" .env.azure
                fi
            else
                echo "POSTGRES_ADMIN_PASSWORD=$POSTGRES_ADMIN_PASSWORD" >> .env.azure
            fi
        fi
    else
        print_info "Using existing PostgreSQL password from .env.azure"
    fi

    # Generate Django SECRET_KEY if not set
    if [ -z "$DJANGO_SECRET_KEY" ]; then
        print_info "Generating Django SECRET_KEY..."

        # Try Python 3 first, then Python
        if command -v python3 &> /dev/null; then
            DJANGO_SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())' 2>/dev/null || openssl rand -base64 50)
        elif command -v python &> /dev/null; then
            DJANGO_SECRET_KEY=$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())' 2>/dev/null || openssl rand -base64 50)
        else
            DJANGO_SECRET_KEY=$(openssl rand -base64 50)
        fi

        print_success "Django SECRET_KEY generated"

        # Optionally save to .env.azure
        if [ -f .env.azure ]; then
            if grep -q "DJANGO_SECRET_KEY=" .env.azure; then
                # Update existing line (macOS compatible)
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s|DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=$DJANGO_SECRET_KEY|" .env.azure
                else
                    sed -i "s|DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=$DJANGO_SECRET_KEY|" .env.azure
                fi
            else
                echo "DJANGO_SECRET_KEY=$DJANGO_SECRET_KEY" >> .env.azure
            fi
        fi
    else
        print_info "Using existing Django SECRET_KEY from .env.azure"
    fi

    export POSTGRES_ADMIN_PASSWORD
    export DJANGO_SECRET_KEY
}

# =============================================================================
# Create Resource Group
# =============================================================================

create_resource_group() {
    print_header "Creating Resource Group"

    if az group show --name "$AZURE_RESOURCE_GROUP" &> /dev/null; then
        print_info "Resource group '$AZURE_RESOURCE_GROUP' already exists"
    else
        print_info "Creating resource group '$AZURE_RESOURCE_GROUP' in '$AZURE_LOCATION'..."
        az group create \
            --name "$AZURE_RESOURCE_GROUP" \
            --location "$AZURE_LOCATION" \
            --output none
        print_success "Resource group created"
    fi
}

# =============================================================================
# Deploy Infrastructure
# =============================================================================

deploy_infrastructure() {
    print_header "Deploying Infrastructure"

    print_info "Starting Bicep deployment..."
    print_info "This may take 5-10 minutes..."

    DEPLOYMENT_NAME="energy-contracts-$(date +%Y%m%d-%H%M%S)"

    # Deploy using Bicep template with parameters
    az deployment group create \
        --name "$DEPLOYMENT_NAME" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --template-file main.bicep \
        --parameters "$PARAMETERS_FILE" \
        --parameters postgresAdminPassword="$POSTGRES_ADMIN_PASSWORD" \
        --parameters djangoSecretKey="$DJANGO_SECRET_KEY" \
        --output json > deployment-output.json

    if [ $? -eq 0 ]; then
        print_success "Infrastructure deployed successfully"
    else
        print_error "Deployment failed"
        exit 1
    fi
}

# =============================================================================
# Display Deployment Information
# =============================================================================

display_deployment_info() {
    print_header "Deployment Information"

    # Extract outputs from deployment
    APP_SERVICE_URL=$(jq -r '.properties.outputs.appServiceUrl.value' deployment-output.json)
    APP_SERVICE_NAME=$(jq -r '.properties.outputs.appServiceName.value' deployment-output.json)
    POSTGRES_SERVER_FQDN=$(jq -r '.properties.outputs.postgresServerFqdn.value' deployment-output.json)
    POSTGRES_SERVER_NAME=$(jq -r '.properties.outputs.postgresServerName.value' deployment-output.json)
    POSTGRES_DATABASE_NAME=$(jq -r '.properties.outputs.postgresDatabaseName.value' deployment-output.json)
    STORAGE_ACCOUNT_NAME=$(jq -r '.properties.outputs.storageAccountName.value' deployment-output.json)
    KEY_VAULT_NAME=$(jq -r '.properties.outputs.keyVaultName.value' deployment-output.json)

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                   DEPLOYMENT SUCCESSFUL!                       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    print_info "Application URL: $APP_SERVICE_URL"
    print_info "App Service Name: $APP_SERVICE_NAME"
    print_info "PostgreSQL Server: $POSTGRES_SERVER_FQDN"
    print_info "Database Name: $POSTGRES_DATABASE_NAME"
    print_info "Storage Account: $STORAGE_ACCOUNT_NAME"
    print_info "Key Vault: $KEY_VAULT_NAME"

    echo ""
    print_header "Next Steps"

    echo "1. Configure GitHub Actions for CD:"
    echo "   ${YELLOW}az webapp deployment source config \\${NC}"
    echo "   ${YELLOW}     --name $APP_SERVICE_NAME \\${NC}"
    echo "   ${YELLOW}     --resource-group $AZURE_RESOURCE_GROUP \\${NC}"
    echo "   ${YELLOW}     --repo-url <your-github-repo> \\${NC}"
    echo "   ${YELLOW}     --branch main --manual-integration${NC}"
    echo ""

    echo "2. Run database migrations via SSH:"
    echo "   ${YELLOW}az webapp ssh --name $APP_SERVICE_NAME --resource-group $AZURE_RESOURCE_GROUP${NC}"
    echo "   Then run: ${YELLOW}python manage.py migrate${NC}"
    echo ""

    echo "3. Create Django superuser:"
    echo "   ${YELLOW}az webapp ssh --name $APP_SERVICE_NAME --resource-group $AZURE_RESOURCE_GROUP${NC}"
    echo "   Then run: ${YELLOW}python manage.py createsuperuser${NC}"
    echo ""

    echo "4. Update frontend NEXT_PUBLIC_API_URL:"
    echo "   ${YELLOW}NEXT_PUBLIC_API_URL=$APP_SERVICE_URL${NC}"
    echo ""

    echo "5. Add frontend domain to CORS_ALLOWED_ORIGINS in App Service settings"
    echo ""

    print_header "Cost Optimization Tips"
    echo "• Stop PostgreSQL when not in use:"
    echo "  ${YELLOW}az postgres flexible-server stop --name $POSTGRES_SERVER_NAME --resource-group $AZURE_RESOURCE_GROUP${NC}"
    echo ""
    echo "• Monitor costs in Azure Portal: Cost Management + Billing"
    echo "• Consider reserved capacity for production (up to 60% savings)"
    echo ""

    print_info "Deployment details saved to: deployment-output.json"

    # Save connection info to a file
    cat > deployment-info.txt <<EOF
Deployment Information
======================
Date: $(date)
Environment: $ENVIRONMENT

Application
-----------
URL: $APP_SERVICE_URL
App Service: $APP_SERVICE_NAME
Resource Group: $AZURE_RESOURCE_GROUP
Location: $AZURE_LOCATION

Database
--------
Server: $POSTGRES_SERVER_FQDN
Database: $POSTGRES_DATABASE_NAME
Username: ${POSTGRES_ADMIN_USERNAME:-pgadmin}

Storage
-------
Account: $STORAGE_ACCOUNT_NAME
Container: media

Security
--------
Key Vault: $KEY_VAULT_NAME

Secrets stored in Key Vault:
- postgres-admin-password
- django-secret-key
- storage-connection-string

Connection Strings
------------------
PostgreSQL:
postgresql://${POSTGRES_ADMIN_USERNAME:-pgadmin}@$POSTGRES_SERVER_NAME:[PASSWORD]@$POSTGRES_SERVER_FQDN:5432/$POSTGRES_DATABASE_NAME?sslmode=require

EOF

    print_success "Connection info saved to: deployment-info.txt"
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    clear
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║         Energy Contracts - Azure Deployment Script           ║"
    echo "║                                                               ║"
    echo "║  This script will deploy your Django backend to Azure using  ║"
    echo "║  managed services (App Service, PostgreSQL, Storage, etc.)   ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    check_prerequisites
    load_configuration
    generate_secrets
    create_resource_group
    deploy_infrastructure
    display_deployment_info

    echo ""
    print_success "Deployment complete!"
    echo ""
}

# Run main function
main

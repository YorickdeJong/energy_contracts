// =============================================================================
// Azure Infrastructure for Energy Contracts Django Backend
// =============================================================================
// This Bicep template deploys a cost-effective, secure Django application
// infrastructure on Azure with the following resources:
// - PostgreSQL Flexible Server (Burstable B1ms - $12.41/month)
// - App Service Plan (Basic B1 - $13.14/month)
// - App Service (Linux, Python 3.11)
// - Storage Account (for media files)
// - Key Vault (for secrets management)
// - Managed Identity (for passwordless connections)
// Total estimated cost: ~$27-28/month for development/small scale
// =============================================================================

@description('Environment name (dev, staging, prod)')
param environment string = 'dev'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Base name for all resources')
param projectName string = 'energy-contracts'

@description('PostgreSQL administrator username')
param postgresAdminUsername string = 'pgadmin'

@description('PostgreSQL administrator password')
@secure()
param postgresAdminPassword string

@description('Django SECRET_KEY')
@secure()
param djangoSecretKey string

@description('PostgreSQL version')
param postgresVersion string = '16'

@description('Python version for App Service')
param pythonVersion string = '3.11'

@description('PostgreSQL SKU (Burstable B1ms for cost optimization)')
param postgresSku string = 'Standard_B1ms'

@description('App Service Plan SKU (B1 for cost optimization)')
param appServiceSku string = 'B1'

// =============================================================================
// Variables
// =============================================================================

var resourceNamePrefix = '${projectName}-${environment}'
var postgresServerName = '${resourceNamePrefix}-postgres'
var appServicePlanName = '${resourceNamePrefix}-plan'
var appServiceName = '${resourceNamePrefix}-app'
var storageAccountName = replace('${resourceNamePrefix}storage', '-', '')
var keyVaultName = '${resourceNamePrefix}-kv'
var managedIdentityName = '${resourceNamePrefix}-identity'

// =============================================================================
// User-Assigned Managed Identity
// =============================================================================
// Used for passwordless connections between App Service and PostgreSQL

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: managedIdentityName
  location: location
}

// =============================================================================
// Azure Key Vault
// =============================================================================
// Stores all application secrets (database passwords, Django SECRET_KEY, etc.)

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true // Use Azure RBAC instead of access policies
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: true
  }
}

// Grant the managed identity access to Key Vault secrets
resource keyVaultSecretUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, managedIdentity.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Store PostgreSQL admin password in Key Vault
resource postgresPasswordSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'postgres-admin-password'
  properties: {
    value: postgresAdminPassword
  }
}

// Store Django SECRET_KEY in Key Vault
resource djangoSecretKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'django-secret-key'
  properties: {
    value: djangoSecretKey
  }
}

// =============================================================================
// Azure Database for PostgreSQL Flexible Server
// =============================================================================
// Cost-optimized with Burstable B1ms SKU (1 vCore, 2GiB RAM)
// Supports stop/start for additional savings in dev environments

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: postgresServerName
  location: location
  sku: {
    name: postgresSku
    tier: 'Burstable'
  }
  properties: {
    version: postgresVersion
    administratorLogin: postgresAdminUsername
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 32 // Minimum for Burstable tier
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled' // Cost optimization
    }
    highAvailability: {
      mode: 'Disabled' // Cost optimization (enable for production)
    }
    availabilityZone: '1'
  }
}

// Create the energy_contracts database
resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresServer
  name: 'energy_contracts'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Allow Azure services to connect to PostgreSQL
resource postgresFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-03-01-preview' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Configure PostgreSQL for Azure AD authentication
resource postgresAadAdmin 'Microsoft.DBforPostgreSQL/flexibleServers/administrators@2023-03-01-preview' = {
  parent: postgresServer
  name: managedIdentity.properties.principalId
  properties: {
    principalType: 'ServicePrincipal'
    principalName: managedIdentity.name
    tenantId: subscription().tenantId
  }
}

// =============================================================================
// Azure Storage Account
// =============================================================================
// Stores Django media files (uploaded documents: proof_document,
// inventory_report, checkout_reading)

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS' // Locally redundant storage (cost-effective)
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false // Security: no public blob access
  }
}

// Create blob container for media files
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource mediaContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'media'
  properties: {
    publicAccess: 'None'
  }
}

// Grant managed identity access to storage
resource storageBlobDataContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, managedIdentity.id, 'Storage Blob Data Contributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe') // Storage Blob Data Contributor
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Store storage account connection string in Key Vault
resource storageConnectionStringSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'storage-connection-string'
  properties: {
    value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${az.environment().suffixes.storage}'
  }
}

// =============================================================================
// Azure App Service Plan
// =============================================================================
// Linux-based plan for Python Django application

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: appServiceSku
    tier: 'Basic'
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true // Required for Linux
  }
}

// =============================================================================
// Azure App Service (Web App)
// =============================================================================
// Hosts the Django application with automatic deployment from GitHub

resource appService 'Microsoft.Web/sites@2023-01-01' = {
  name: appServiceName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'PYTHON|${pythonVersion}'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      pythonVersion: pythonVersion
      appSettings: [
        // Django settings
        {
          name: 'DJANGO_SETTINGS_MODULE'
          value: 'config.settings'
        }
        {
          name: 'SECRET_KEY'
          value: '@Microsoft.KeyVault(SecretUri=${djangoSecretKeySecret.properties.secretUri})'
        }
        {
          name: 'DEBUG'
          value: environment == 'prod' ? 'False' : 'True'
        }
        {
          name: 'ALLOWED_HOSTS'
          value: '${appServiceName}.azurewebsites.net,localhost,127.0.0.1'
        }

        // Database settings (using Key Vault reference for password)
        {
          name: 'DATABASE_ENGINE'
          value: 'django.db.backends.postgresql'
        }
        {
          name: 'DATABASE_NAME'
          value: 'energy_contracts'
        }
        {
          name: 'DATABASE_USER'
          value: postgresAdminUsername
        }
        {
          name: 'DATABASE_PASSWORD'
          value: '@Microsoft.KeyVault(SecretUri=${postgresPasswordSecret.properties.secretUri})'
        }
        {
          name: 'DATABASE_HOST'
          value: postgresServer.properties.fullyQualifiedDomainName
        }
        {
          name: 'DATABASE_PORT'
          value: '5432'
        }

        // Azure Storage settings
        {
          name: 'AZURE_STORAGE_ACCOUNT_NAME'
          value: storageAccount.name
        }
        {
          name: 'AZURE_STORAGE_CONTAINER'
          value: 'media'
        }
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: '@Microsoft.KeyVault(SecretUri=${storageConnectionStringSecret.properties.secretUri})'
        }

        // Managed Identity
        {
          name: 'AZURE_CLIENT_ID'
          value: managedIdentity.properties.clientId
        }

        // CORS settings for frontend
        {
          name: 'CORS_ALLOWED_ORIGINS'
          value: 'https://${appServiceName}.azurewebsites.net'
        }

        // JWT token settings
        {
          name: 'ACCESS_TOKEN_LIFETIME'
          value: '15'
        }
        {
          name: 'REFRESH_TOKEN_LIFETIME'
          value: '7'
        }

        // Python settings
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'POST_BUILD_COMMAND'
          value: 'python manage.py migrate --noinput && python manage.py collectstatic --noinput'
        }
      ]
    }
  }
}

// Enable Key Vault integration for App Service
resource appServiceKeyVaultReference 'Microsoft.Web/sites/config@2023-01-01' = {
  parent: appService
  name: 'web'
  properties: {
    keyVaultReferenceIdentity: managedIdentity.id
  }
  dependsOn: [
    keyVaultSecretUserRole
  ]
}

// =============================================================================
// Outputs
// =============================================================================
// Connection strings and important information for post-deployment

output appServiceUrl string = 'https://${appService.properties.defaultHostName}'
output appServiceName string = appService.name
output postgresServerFqdn string = postgresServer.properties.fullyQualifiedDomainName
output postgresServerName string = postgresServer.name
output postgresDatabaseName string = postgresDatabase.name
output storageAccountName string = storageAccount.name
output keyVaultName string = keyVault.name
output managedIdentityClientId string = managedIdentity.properties.clientId
output managedIdentityPrincipalId string = managedIdentity.properties.principalId

// Connection string for local development/testing
output postgresConnectionString string = 'postgresql://${postgresAdminUsername}@${postgresServer.name}:${postgresAdminPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/energy_contracts?sslmode=require'

// Instructions
output deploymentInstructions string = '''
Deployment successful! Next steps:

1. Configure GitHub Actions for continuous deployment:
   az webapp deployment source config --name ${appService.name} --resource-group ${resourceGroup().name} --repo-url <your-github-repo> --branch main --manual-integration

2. Run database migrations via SSH:
   az webapp ssh --name ${appService.name} --resource-group ${resourceGroup().name}
   Then run: python manage.py migrate

3. Create Django superuser:
   az webapp ssh --name ${appService.name} --resource-group ${resourceGroup().name}
   Then run: python manage.py createsuperuser

4. Update your frontend NEXT_PUBLIC_API_URL to: https://${appService.properties.defaultHostName}

5. Add your frontend domain to CORS_ALLOWED_ORIGINS in App Service configuration

For cost optimization:
- Stop the PostgreSQL server when not in use: az postgres flexible-server stop --name ${postgresServer.name} --resource-group ${resourceGroup().name}
- Consider reserved capacity for production (up to 60% savings)
'''

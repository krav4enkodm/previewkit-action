# Getting Started with PreviewKit

Get preview environments for your Pull Requests in under 5 minutes.

## What You'll Get

When you open a PR, PreviewKit will automatically:
- Build your Docker image
- Deploy it to Azure Container Apps
- Post a comment with the preview URL

When you close the PR, it cleans up everything automatically.

---

## Prerequisites Checklist

Before you start, make sure you have:

- [ ] A GitHub repository with a `Dockerfile`
- [ ] An Azure account with active subscription
- [ ] Azure CLI installed ([install guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
- [ ] Logged into Azure CLI (`az login`)
- [ ] Owner or Contributor role on your Azure subscription

---

## 5-Minute Setup

### Step 1: Run the Setup Script

Copy and paste this into your terminal (replace the variables at the top):

```bash
# ========== CHANGE THESE ==========
RESOURCE_GROUP="my-previews"
ACR_NAME="myregistry123"           # Must be globally unique
ENVIRONMENT_NAME="preview-env"
GITHUB_REPO="myorg/myrepo"         # Format: owner/repo
# ==================================

LOCATION="eastus"
IDENTITY_NAME="previewkit-acr-pull"
APP_NAME="previewkit-github"

# Create resource group
echo "Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Container Apps environment
echo "Creating Container Apps environment..."
az containerapp env create \
    --name $ENVIRONMENT_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION

# Create Container Registry
echo "Creating Container Registry..."
az acr create \
    --name $ACR_NAME \
    --resource-group $RESOURCE_GROUP \
    --sku Basic \
    --location $LOCATION

# Create managed identity for ACR pull
echo "Creating managed identity..."
az identity create \
    --name $IDENTITY_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION

# Grant AcrPull permission
echo "Granting ACR permissions..."
IDENTITY_PRINCIPAL=$(az identity show --name $IDENTITY_NAME --resource-group $RESOURCE_GROUP --query principalId -o tsv)
ACR_ID=$(az acr show --name $ACR_NAME --query id -o tsv)
az role assignment create \
    --assignee $IDENTITY_PRINCIPAL \
    --role AcrPull \
    --scope $ACR_ID

# Create app registration for GitHub OIDC
echo "Setting up GitHub authentication..."
az ad app create --display-name $APP_NAME > /dev/null

APP_ID=$(az ad app list --display-name $APP_NAME --query "[0].appId" -o tsv)
OBJECT_ID=$(az ad app list --display-name $APP_NAME --query "[0].id" -o tsv)

az ad sp create --id $APP_ID > /dev/null
SP_OBJECT_ID=$(az ad sp list --filter "appId eq '$APP_ID'" --query "[0].id" -o tsv)

SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Grant Contributor role
az role assignment create \
    --assignee $SP_OBJECT_ID \
    --role Contributor \
    --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP > /dev/null

# Create federated credential for pull requests
az ad app federated-credential create \
    --id $OBJECT_ID \
    --parameters "{
        \"name\": \"github-pr\",
        \"issuer\": \"https://token.actions.githubusercontent.com\",
        \"subject\": \"repo:${GITHUB_REPO}:pull_request\",
        \"audiences\": [\"api://AzureADTokenExchange\"]
    }" > /dev/null

# Get identity resource ID
IDENTITY_ID=$(az identity show --name $IDENTITY_NAME --resource-group $RESOURCE_GROUP --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

# Print credentials (you'll need these for GitHub)
echo ""
echo "=========================================="
echo "✅ Azure setup complete!"
echo "=========================================="
echo ""
echo "Add these to GitHub Secrets:"
echo "----------------------------"
echo "AZURE_CLIENT_ID:       $APP_ID"
echo "AZURE_TENANT_ID:       $TENANT_ID"
echo "AZURE_SUBSCRIPTION_ID: $SUBSCRIPTION_ID"
echo ""
echo "Add these to GitHub Variables:"
echo "------------------------------"
echo "AZURE_RESOURCE_GROUP:     $RESOURCE_GROUP"
echo "AZURE_LOCATION:           $LOCATION"
echo "AZURE_CONTAINER_REGISTRY: ${ACR_NAME}.azurecr.io"
echo "AZURE_REGISTRY_IDENTITY:  $IDENTITY_ID"
echo "AZURE_ENVIRONMENT_NAME:   $ENVIRONMENT_NAME"
echo ""
```

### Step 2: Configure GitHub Repository

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**

2. Click **New repository secret** and add these **Secrets**:
   - `AZURE_CLIENT_ID`
   - `AZURE_TENANT_ID`
   - `AZURE_SUBSCRIPTION_ID`

3. Click the **Variables** tab and add these **Variables**:
   - `AZURE_RESOURCE_GROUP`
   - `AZURE_LOCATION`
   - `AZURE_CONTAINER_REGISTRY`
   - `AZURE_REGISTRY_IDENTITY`
   - `AZURE_ENVIRONMENT_NAME`

### Step 3: Add Workflow File

Create `.github/workflows/preview.yml` in your repository:

```yaml
name: PR Preview

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

permissions:
  id-token: write
  contents: read
  pull-requests: write

env:
  AZURE_CONTAINER_REGISTRY: ${{ vars.AZURE_CONTAINER_REGISTRY }}
  IMAGE_NAME: my-app  # Change this to your app name

jobs:
  preview:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Login to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Build and push image
        if: github.event.action != 'closed'
        run: |
          az acr login --name ${{ env.AZURE_CONTAINER_REGISTRY }}
          docker build -t ${{ env.AZURE_CONTAINER_REGISTRY }}/${{ env.IMAGE_NAME }}:pr-${{ github.event.pull_request.number }} .
          docker push ${{ env.AZURE_CONTAINER_REGISTRY }}/${{ env.IMAGE_NAME }}:pr-${{ github.event.pull_request.number }}

      - name: Deploy Preview
        uses: krav4enkodm/previewkit/action@main
        with:
          service-name: ${{ env.IMAGE_NAME }}
          port: 3000  # Change this to your app's port
          cloud: azure
          azure-subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          azure-resource-group: ${{ vars.AZURE_RESOURCE_GROUP }}
          azure-location: ${{ vars.AZURE_LOCATION }}
          azure-container-app-environment: ${{ vars.AZURE_ENVIRONMENT_NAME }}
          azure-registry-server: ${{ env.AZURE_CONTAINER_REGISTRY }}
          azure-registry-identity: ${{ vars.AZURE_REGISTRY_IDENTITY }}
          image: ${{ env.AZURE_CONTAINER_REGISTRY }}/${{ env.IMAGE_NAME }}:pr-${{ github.event.pull_request.number }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Important:** Update these values in the workflow:
- `IMAGE_NAME`: Your application name
- `port`: The port your app listens on (e.g., 3000, 8080)

### Step 4: Test It

1. Commit and push the workflow file to your repository
2. Create a new Pull Request
3. Watch the Actions tab - you should see the workflow running
4. Once complete, check your PR for a comment with the preview URL

---

## Troubleshooting

### "Environment not found"

**Problem:** The Container Apps Environment name is wrong or doesn't exist.

**Solution:**
```bash
# List all environments in your resource group
az containerapp env list --resource-group YOUR_RESOURCE_GROUP --query "[].name" -o tsv
```

Update the `AZURE_ENVIRONMENT_NAME` variable in GitHub with the correct name.

---

### "Failed to pull image" / ACR Authentication Error

**Problem:** Container App can't access the container registry.

**Solution:**
```bash
# Verify the managed identity has AcrPull role
az role assignment list \
    --assignee $(az identity show --name previewkit-acr-pull --resource-group YOUR_RESOURCE_GROUP --query principalId -o tsv) \
    --scope $(az acr show --name YOUR_ACR_NAME --query id -o tsv)
```

If empty, re-run the role assignment command from Step 1.

---

### "OIDC authentication failed"

**Problem:** GitHub can't authenticate to Azure.

**Solution:**
1. Verify the federated credential subject matches your repo:
   ```bash
   az ad app federated-credential list --id YOUR_APP_OBJECT_ID
   ```

2. The subject should be: `repo:YOUR_ORG/YOUR_REPO:pull_request`

3. If wrong, delete and recreate:
   ```bash
   az ad app federated-credential delete --id YOUR_APP_OBJECT_ID --federated-credential-id github-pr
   # Then re-run the federated credential create command from Step 1
   ```

---

### "docker: command not found" or Build Fails

**Problem:** Your Dockerfile is missing or has errors.

**Solution:**
1. Make sure you have a `Dockerfile` in your repository root
2. Test it locally:
   ```bash
   docker build -t test .
   ```
3. If it fails locally, fix the Dockerfile first

---

### "No such file or directory" when accessing the preview

**Problem:** Your app isn't starting correctly in the container.

**Solution:**
1. Check the Container App logs in Azure Portal:
   - Go to Azure Portal → Container Apps
   - Find your preview app (e.g., `my-app-pr-123-abc1234`)
   - Click **Log stream** to see what's happening

2. Common issues:
   - Wrong port in the workflow (doesn't match your app)
   - Missing environment variables
   - App crashes on startup

---

## What's Next?

- **Multiple environments?** See [usage-guide.md](./usage-guide.md#multiple-services)
- **Custom environment variables?** See [usage-guide.md](./usage-guide.md#custom-environment-variables)
- **Need help?** [Open an issue](https://github.com/krav4enkodm/previewkit/issues)

---

## Quick Reference

**Repository Secrets:**
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

**Repository Variables:**
- `AZURE_RESOURCE_GROUP`
- `AZURE_LOCATION`
- `AZURE_CONTAINER_REGISTRY`
- `AZURE_REGISTRY_IDENTITY`
- `AZURE_ENVIRONMENT_NAME`

**Workflow must change:**
- `IMAGE_NAME` - your app name
- `port` - your app's port number

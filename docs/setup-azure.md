# Azure Setup Guide

Deploy PR preview environments to Azure Container Apps in 10 minutes.

---

## What You'll Get

Every Pull Request gets its own preview environment:

- Automatic deployment on PR open/update
- Automatic teardown on PR close
- Preview URL posted as a PR comment

---

## Prerequisites

You need:

1. An Azure subscription
2. A Resource Group (e.g., `rg-preview`)
3. A Container Apps Environment
4. An Azure Container Registry (ACR)
5. GitHub OIDC configured with Azure

**You do NOT need:**

- Kubernetes
- Custom networking
- DevOps expertise

---

## Step 1: Create Azure Resources

### Option A: Azure CLI (recommended)

```bash
# Set variables
RESOURCE_GROUP="rg-preview"
LOCATION="eastus"
ACR_NAME="mypreviewregistry"
ENVIRONMENT_NAME="preview-env"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Container Registry
az acr create --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME --sku Basic --admin-enabled false

# Create Container Apps Environment
az containerapp env create --name $ENVIRONMENT_NAME \
  --resource-group $RESOURCE_GROUP --location $LOCATION
```

### Option B: Azure Portal

1. Create a Resource Group
2. Create a Container Registry (Basic SKU is fine)
3. Create a Container Apps Environment (Consumption plan)

---

## Step 2: Configure GitHub OIDC

OIDC lets GitHub Actions authenticate with Azure without storing secrets.

### Create App Registration

```bash
# Create app registration
az ad app create --display-name "GitHub-PreviewKit"

# Get the app ID
APP_ID=$(az ad app list --display-name "GitHub-PreviewKit" --query "[0].appId" -o tsv)

# Create service principal
az ad sp create --id $APP_ID

# Assign Contributor role to the resource group
az role assignment create \
  --role "Contributor" \
  --assignee $APP_ID \
  --scope "/subscriptions/{SUBSCRIPTION_ID}/resourceGroups/$RESOURCE_GROUP"
```

### Add Federated Credential

```bash
# Replace with your GitHub org/repo
GITHUB_ORG="your-org"
GITHUB_REPO="your-repo"

az ad app federated-credential create --id $APP_ID --parameters '{
  "name": "github-preview",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':pull_request",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

### Add GitHub Secrets

In your repository, add these secrets:

- `AZURE_CLIENT_ID` — App registration ID
- `AZURE_TENANT_ID` — Your Azure AD tenant ID
- `AZURE_SUBSCRIPTION_ID` — Your subscription ID

---

## Step 3: Add Workflow

Create `.github/workflows/preview.yml`:

```yaml
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Build and Push
        if: github.event.action != 'closed'
        run: |
          az acr login --name mypreviewregistry
          docker build -t mypreviewregistry.azurecr.io/myapp:${{ github.sha }} .
          docker push mypreviewregistry.azurecr.io/myapp:${{ github.sha }}

      - name: PreviewKit
        uses: previewkit/previewkit@v1
        with:
          service-name: myapp
          port: 3000
          azure-subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          azure-resource-group: rg-preview
          azure-container-app-environment: preview-env
          azure-registry-server: mypreviewregistry.azurecr.io
          image: mypreviewregistry.azurecr.io/myapp:${{ github.sha }}
```

---

## Step 4: Open a PR

That's it. Open a Pull Request and watch the preview deploy.

---

## Common Issues

### "No permission to access registry"

Your Container App needs pull access to ACR. Grant it:

```bash
az role assignment create \
  --role "AcrPull" \
  --assignee-object-id $(az containerapp show -n myapp-pr-1 -g rg-preview --query identity.principalId -o tsv) \
  --scope $(az acr show --name mypreviewregistry --query id -o tsv)
```

Or enable Admin user on ACR (simpler but less secure):

```bash
az acr update --name mypreviewregistry --admin-enabled true
```

### "Container App Environment not found"

Verify the environment exists and the name matches:

```bash
az containerapp env list --resource-group rg-preview
```

### "OIDC token request failed"

Ensure your workflow has:

```yaml
permissions:
  id-token: write
```

And the federated credential subject matches `repo:org/repo:pull_request`.

---

## What This Does NOT Support

- **Databases**: Each preview uses your shared integration database
- **Custom networking**: Previews use public ingress only
- **Kubernetes**: We deploy to Container Apps, not AKS
- **Multi-service previews**: One PR = one service preview

These constraints are intentional. They keep previews simple and cheap.

---

## Cost

Container Apps has a consumption plan:

- **CPU**: ~$0.000024/vCPU-second
- **Memory**: ~$0.000003/GiB-second
- **Requests**: First 2M free, then ~$0.40/million

A typical preview costs **< $0.10/day** when idle (scale to zero enabled).

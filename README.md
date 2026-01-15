# PreviewKit Action

**PR-driven preview environments for cloud-native teams.**

Deploy isolated preview environments on every Pull Request—without DevOps overhead, Kubernetes, or custom infrastructure work.

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-PreviewKit-blue?logo=github)](https://github.com/marketplace/actions/previewkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## How It Works

```
PR Opened → Container Deployed → URL Posted → PR Closed → Container Deleted
```

Every PR gets its own isolated preview. Stakeholders review changes via URL. No staging bottlenecks.

---

## Quick Start (Azure)

```yaml
# .github/workflows/preview.yml
name: Preview

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

# IMPORTANT: Prevents race conditions from rapid pushes
concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: ${{ github.event.action != 'closed' }}

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Build & Push
        if: github.event.action != 'closed'
        run: |
          az acr login --name myregistry
          docker build -t myregistry.azurecr.io/app:${{ github.sha }} .
          docker push myregistry.azurecr.io/app:${{ github.sha }}

      - uses: previewkit/action@v1
        with:
          service-name: app
          port: 3000
          azure-subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          azure-resource-group: rg-preview
          azure-container-app-environment: preview-env
          azure-registry-server: myregistry.azurecr.io
          image: myregistry.azurecr.io/app:${{ github.sha }}
```

See [Azure Setup Guide](docs/setup-azure.md) for detailed instructions.

---

## Concurrency (Important!)

Always include the `concurrency` block in your workflow:

```yaml
concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: ${{ github.event.action != 'closed' }}
```

This ensures:
- **Rapid pushes**: Only the latest deployment runs (previous cancelled)
- **PR close**: Destroy always completes (never cancelled)
- **No race conditions**: One operation per PR at a time

---

## Inputs

### License

| Input | Required | Description |
|-------|----------|-------------|
| `license-key` | No | PreviewKit license key (optional for free tier) |

### Service Configuration

| Input | Required | Description |
|-------|----------|-------------|
| `service-name` | Yes | Name of the service |
| `port` | Yes | Container port to expose |
| `cloud` | No | Cloud provider (default: `azure`) |

### Azure Configuration

| Input | Required | Description |
|-------|----------|-------------|
| `azure-subscription-id` | Yes* | Azure subscription ID |
| `azure-resource-group` | Yes* | Resource group name |
| `azure-container-app-environment` | Yes* | Container Apps Environment |
| `azure-registry-server` | No | ACR server URL |
| `azure-registry-identity` | No | Managed identity for ACR pull |
| `image` | No | Container image (default: `service:sha`) |

*Required when `cloud: azure`

### Other

| Input | Required | Description |
|-------|----------|-------------|
| `github-token` | No | GitHub token for PR comments |

---

## Outputs

| Output | Description |
|--------|-------------|
| `preview-url` | URL of the deployed preview |
| `preview-id` | Unique identifier for the preview |
| `license-tier` | License tier used (free, team, business, enterprise) |

---

## Pricing

| Tier | Price | Concurrent Previews | Previews/Month |
|------|-------|---------------------|----------------|
| Free | $0 | 3 | 50 |
| Team | $15/user/mo | 10 | 500 |
| Business | $25/user/mo | 25 | 2000 |
| Enterprise | Custom | Unlimited | Unlimited |

Get a license key at [previewkit.dev](https://previewkit.dev)

---

## Documentation

- [Azure Setup Guide](docs/setup-azure.md)
- [Architecture](docs/architecture.md)
- [Limitations](docs/limitations.md)

---

## Orphan Cleanup (Optional)

Previews are automatically deleted when PRs close. However, edge cases (workflow failures, cancelled runs) may occasionally leave orphaned resources.

**Good news**: Azure Container Apps scale to zero when idle, so orphaned previews cost ~$0.

For teams that want proactive cleanup, add this scheduled workflow:

```yaml
# .github/workflows/preview-cleanup.yml
name: Preview Cleanup

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:      # Manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Cleanup orphaned previews
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          RESOURCE_GROUP: rg-preview
        run: |
          # List all preview container apps
          apps=$(az containerapp list -g $RESOURCE_GROUP --query "[?contains(name, '-pr-')].name" -o tsv)
          
          for app in $apps; do
            # Extract PR number from app name (e.g., "myapp-pr-42" -> "42")
            pr_number=$(echo $app | grep -oP '(?<=-pr-)\d+$')
            
            if [ -n "$pr_number" ]; then
              # Check if PR is still open
              state=$(gh pr view $pr_number --json state -q '.state' 2>/dev/null || echo "NOT_FOUND")
              
              if [ "$state" != "OPEN" ]; then
                echo "Deleting orphaned preview: $app (PR #$pr_number is $state)"
                az containerapp delete -n $app -g $RESOURCE_GROUP -y
              fi
            fi
          done
```

This script:
1. Lists all Container Apps with `-pr-` in the name
2. Checks if the corresponding PR is still open
3. Deletes previews for closed/merged PRs

---

## What This Is

- ✅ A GitHub Action for PR previews
- ✅ Azure Container Apps support (AWS/GCP coming)
- ✅ Zero-config for simple apps
- ✅ Automatic cleanup on PR close

## What This Is NOT

- ❌ A DevOps consulting service
- ❌ A Kubernetes platform
- ❌ A full infrastructure provisioning tool
- ❌ A database provisioning system

---

## License

MIT

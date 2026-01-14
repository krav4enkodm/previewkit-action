# Limitations

PreviewKit is intentionally constrained. These limitations are features, not bugs.

---

## One Service Per Preview

Each Pull Request previews **exactly one service**.

✅ PR #42 deploys `frontend` preview  
✅ PR #43 deploys `api` preview  
❌ PR #42 cannot preview both `frontend` and `api`

**Why?** Cross-service previews create implicit coupling and debugging nightmares. If you need to test frontend + backend together, open two PRs and configure explicit linking (coming in v2).

---

## No Databases

Preview environments do **not** get their own databases.

Your preview connects to your shared integration/staging database.

**Why?** Database provisioning is slow, expensive, and requires data seeding. For most PR reviews, a shared database is sufficient.

**Workaround:** Use environment variables to point previews at a test database:

```yaml
env:
  DATABASE_URL: ${{ secrets.PREVIEW_DATABASE_URL }}
```

---

## No Custom Networking

Previews use **public ingress only**.

- No VNet integration
- No private endpoints
- No custom DNS

**Why?** Network configuration is the #1 source of deployment complexity. Public URLs work for 90% of preview use cases.

**Workaround:** If you need private previews, add authentication at the application level.

---

## No Kubernetes

PreviewKit deploys to **managed container platforms only**:

- Azure Container Apps
- AWS App Runner (coming)
- GCP Cloud Run (coming)

We do not support:

- AKS / EKS / GKE
- Self-managed Kubernetes
- Docker Swarm

**Why?** Kubernetes is powerful but complex. PreviewKit targets teams who want previews without DevOps overhead.

---

## No Infrastructure Provisioning

PreviewKit **does not create**:

- Resource groups
- Container registries
- VNets or subnets
- IAM roles (beyond what's needed)
- DNS zones

**Why?** Infrastructure provisioning should be done once, deliberately, by someone who understands your organization's policies.

PreviewKit operates **inside** a pre-defined scope you control.

---

## No Auto-Detection

PreviewKit **does not**:

- Scan your repo to detect frameworks
- Guess your build commands
- Auto-configure ports or runtime

You must explicitly configure:

- `service-name`
- `service-type`
- `runtime`
- `port` (or use defaults)

**Why?** Auto-detection is magic that breaks. Explicit configuration is predictable.

---

## Single Cloud Per Deployment

Each preview targets **one cloud provider**.

You cannot deploy the same PR to Azure AND AWS simultaneously.

**Why?** Multi-cloud deployments add complexity with minimal benefit for PR previews.

---

## TTL Cleanup Is Best-Effort

When TTL expires, previews are deleted on a best-effort basis.

- Cleanup runs on subsequent workflow triggers
- Orphaned resources may exist briefly

**Why?** GitHub Actions doesn't support scheduled runs per-repo without custom scheduling. Full cleanup requires a SaaS backend (coming in v2).

**Mitigation:** Set a reasonable `ttl-hours` and periodically audit your resource group:

```bash
az containerapp list --resource-group rg-preview --query "[].name"
```

---

## These Are Features

Every limitation is a design choice:

| Limitation           | Benefit                      |
| -------------------- | ---------------------------- |
| One service per PR   | Clear ownership, no coupling |
| No databases         | Fast deploys, low cost       |
| No custom networking | Zero network debugging       |
| No Kubernetes        | Simpler mental model         |
| No auto-detection    | Predictable behavior         |

If you need features we don't support, PreviewKit might not be the right tool.

We'd rather do less, well, than more, poorly.

# Architecture

PreviewKit is designed as a **cloud-agnostic GitHub Action** with pluggable adapters.

---

## System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Actions                            │
│                                                                  │
│  ┌──────────────┐                                               │
│  │ pull_request │──────┐                                        │
│  │    event     │      │                                        │
│  └──────────────┘      ▼                                        │
│                 ┌──────────────┐                                │
│                 │   index.ts   │  Entry point                   │
│                 └──────┬───────┘                                │
│                        │                                        │
│           ┌────────────┼────────────┐                           │
│           ▼            ▼            ▼                           │
│    ┌────────────┐ ┌─────────┐ ┌──────────────┐                 │
│    │  context   │ │ naming  │ │  lifecycle   │  Product Core   │
│    └────────────┘ └─────────┘ └──────┬───────┘                 │
│                                      │                          │
│                           ┌──────────┴──────────┐               │
│                           ▼                     ▼               │
│                   ┌──────────────┐       ┌──────────────┐       │
│                   │    Azure     │       │    AWS       │       │
│                   │   Adapter    │       │   Adapter    │  ...  │
│                   └──────┬───────┘       └──────────────┘       │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Azure     │
                    │ Container   │
                    │    Apps      │
                    └──────────────┘
```

---

## Key Components

### 1. Entry Point (`src/index.ts`)

- Reads GitHub event context
- Validates inputs
- Routes to create or destroy flow
- Manages PR comments

### 2. Product Core (`src/core/`)

Cloud-agnostic business logic.

| Module                | Responsibility                                        |
| --------------------- | ----------------------------------------------------- |
| `context.ts`          | Build `PreviewContext` from inputs + PR metadata      |
| `naming.ts`           | Deterministic preview names (`<service>-pr-<number>`) |
| `previewLifecycle.ts` | Orchestrate create/destroy via adapters               |

**Rule:** Core modules must never import cloud-specific code.

### 3. Adapters (`src/adapters/`)

Cloud-specific implementations of `PreviewAdapter` interface.

```typescript
interface PreviewAdapter {
  deployPreview(context: PreviewContext): Promise<PreviewResult>;
  destroyPreview(previewId: string): Promise<void>;
}
```

Current adapters:

- `AzureContainerAppsAdapter` — Azure Container Apps

Planned adapters:

- `AwsAppRunnerAdapter` — AWS App Runner
- `GcpCloudRunAdapter` — GCP Cloud Run

### 4. GitHub Integration (`src/github/`)

| Module           | Responsibility                                |
| ---------------- | --------------------------------------------- |
| `pullRequest.ts` | Extract PR metadata from GitHub context       |
| `comments.ts`    | Create/update PR comments with preview status |

---

## Design Principles

### 1. Cloud is an Implementation Detail

The product core knows nothing about Azure, AWS, or GCP. Cloud providers are selected at runtime via adapter registration.

### 2. Explicit Over Magic

No auto-detection of:

- Frameworks
- Build commands
- Port numbers
- Architecture patterns

Users explicitly configure what they need.

### 3. Minimal Surface Area

Adapters do **one thing**: deploy/destroy containers.

Adapters do **not**:

- Create networks
- Provision databases
- Manage IAM
- Orchestrate multiple services

### 4. Idempotent Operations

All operations are safe to retry:

- `deployPreview` creates or updates
- `destroyPreview` succeeds even if already deleted

### 5. Fail Fast

Invalid configuration fails immediately with clear error messages. No partial deployments, no silent failures.

---

## Adding a New Cloud Provider

1. Create adapter directory: `src/adapters/<cloud>/`
2. Implement `PreviewAdapter` interface
3. Register adapter in `src/index.ts`:
   ```typescript
   registerAdapter("aws", () => new AwsAppRunnerAdapter());
   ```
4. Add cloud-specific inputs to `action.yml`
5. Document in `docs/setup-<cloud>.md`

No changes to product core required.

---

## Data Flow

### Deploy Flow

```
1. GitHub triggers workflow (PR opened/synced)
2. index.ts reads inputs + PR metadata
3. buildPreviewContext() creates normalized context
4. createPreview() validates and selects adapter
5. adapter.deployPreview() creates Container App
6. upsertPreviewComment() posts URL to PR
```

### Destroy Flow

```
1. GitHub triggers workflow (PR closed)
2. index.ts reads PR metadata
3. destroyPreview() calculates preview ID
4. adapter.destroyPreview() deletes Container App
5. upsertPreviewComment() updates PR comment
```

---

## Preview Naming

Preview names are **deterministic** and **collision-free**:

```
<service>-pr-<number>
```

Examples:

- `frontend-pr-123`
- `api-pr-42`
- `my-service-pr-999`

This allows:

- Lookup without database
- Safe updates on re-deploy
- Consistent resource naming across clouds

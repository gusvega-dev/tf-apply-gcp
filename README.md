# Terraform Apply GCP Action (`tf-apply-gcp`)

`tf-apply-gcp` is a GitHub Action that runs `terraform apply` inside a containerized environment. It simplifies Terraform execution by securely handling credentials, secrets, and workspace setup while maintaining a clean and structured output.

---

## Features

- **Containerized Execution** → Runs in a prebuilt Docker container with Terraform installed.
- **Automatic Directory Handling** → Automatically switches to the specified Terraform directory.
- **Collapsible Terraform Output** → Uses GitHub Actions' grouping to improve readability.
- **Google Cloud Credentials & Secrets Handling** → Reads authentication and secrets from GitHub Secrets.
- **Flexible Secret Passing** → Pass multiple secrets as JSON for use within Terraform.
- **Works on Any GitHub Runner** → Runs seamlessly on all GitHub-hosted and self-hosted runners.

---

## Usage

### Basic Example
```yaml
- name: Run Terraform Apply
  uses: gusvega-dev/tf-apply-gcp@v1.0.0
  env:
    GOOGLE_APPLICATION_CREDENTIALS: "${{ secrets.GCP_CREDENTIALS }}"
  with:
    workdir: "./terraform"
    secrets: '{"project_id":"${{ secrets.PROJECT_ID }}"}'
```

### What This Does

- Runs `terraform apply` inside the `./terraform` directory.
- Uses Google Cloud credentials from GitHub Secrets.
- Passes Terraform secrets dynamically as a JSON object.
- Displays structured Terraform logs in GitHub Actions.

---

## Inputs

| Name      | Required | Default | Description                             |
|-----------|----------|---------|-----------------------------------------|
| `workdir` | No       | `.`     | Directory containing Terraform files.   |
| `secrets` | No       | `{}`    | JSON object containing Terraform secrets. |

### Example: Passing Multiple Secrets
```yaml
- name: Run Terraform Apply
  uses: gusvega-dev/tf-apply-gcp@v1.0.0
  env:
    GOOGLE_APPLICATION_CREDENTIALS: "${{ secrets.GCP_CREDENTIALS }}"
  with:
    workdir: "./terraform"
    secrets: '{"project_id":"${{ secrets.PROJECT_ID }}", "api_key":"${{ secrets.API_KEY }}"}'
```

---

## Using Secrets in Terraform

Secrets passed to the action are automatically available in Terraform as environment variables prefixed with `TF_VAR_`. Example:

### Defining Secrets in Terraform (`variables.tf`)
```hcl
variable "secrets" {
  type = map(string)
}
```

### Accessing Secrets in Terraform (`main.tf`)
```hcl
provider "google" {
  project = var.secrets["project_id"]
}

resource "some_resource" "example" {
  api_key = var.secrets["api_key"]
}
```

### Outputting Secrets for Debugging (`outputs.tf`)
```hcl
output "project_id" {
  value = var.secrets["project_id"]
  sensitive = true
}
```

---

## Outputs

| Name          | Description                            |
|--------------|--------------------------------|
| `apply_status` | The status of the Terraform Apply execution. |

---

## Handling Terraform Directories

GitHub Actions automatically mounts the repository into `/github/workspace` inside the container. This means Terraform runs inside:

```sh
/github/workspace/terraform
```

The action **automatically switches** to this directory, so you don’t need to configure paths manually.

---

## Example Repository Structure

```
repo-root/
│── .github/
│   ├── workflows/
│   │   ├── terraform-apply.yml  # GitHub Action Workflow
│── terraform/
│   ├── main.tf                 # Terraform Configuration
│   ├── variables.tf            # Variables File
│   ├── outputs.tf              # Outputs File
│   ├── provider.tf             # Provider Configuration
│── README.md                   # Documentation
```

---

## Full Terraform CI/CD Workflow

This workflow runs `terraform apply` automatically when changes are pushed to `main`:

```yaml
name: Terraform Apply

on:
  push:
    branches:
      - main

env:
  GOOGLE_APPLICATION_CREDENTIALS: "${{ secrets.GCP_CREDENTIALS }}"

jobs:
  terraform-apply:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Run Terraform Apply
        uses: gusvega-dev/tf-apply-gcp@v1.0.0
        with:
          workdir: "./terraform"
          secrets: '{"project_id":"${{ secrets.PROJECT_ID }}", "api_key":"${{ secrets.API_KEY }}"}'
```

### What This Workflow Does

✔ Runs Terraform Apply on every push to `main`.  
✔ Ensures the correct Terraform directory is used.  
✔ Uses Google Cloud credentials from GitHub Secrets.  
✔ Passes environment secrets securely.  

---

## Comparison vs. HashiCorp Terraform Action

| Feature                     | `tf-apply-gcp` | HashiCorp Action |
|-----------------------------|----------------|------------------|
| Requires Terraform Install  | No (Containerized) | Yes |
| Supports GCP Authentication | Yes | No |
| Flexible Secret Handling    | Yes (JSON object) | No |
| Structured Logs             | Yes (Collapsible) | No |
| Runs on Any GitHub Runner   | Yes | No (Requires Terraform Installed) |

---

## Troubleshooting

### Terraform Apply Fails
Check logs for errors:
1. Validate your Terraform files for syntax errors.
2. Ensure Google Cloud credentials are set in the `GOOGLE_APPLICATION_CREDENTIALS` environment variable.

### Workdir Not Found
- Ensure the `workdir` input is set correctly.
- Verify that your Terraform configuration exists in the specified directory.

### Debugging Secrets
If Terraform fails due to missing secrets:
1. Check if the secret exists in GitHub Secrets.
2. Print secret values before running Terraform:
   ```yaml
   - name: Debug Secrets
     run: echo "Project ID: ${{ secrets.PROJECT_ID }}"
   ```
3. Ensure secrets are passed as a JSON object to the action.

---

## Future Actions
As part of a broader Terraform automation suite, additional actions will be developed, including:

### **Infrastructure Provisioning & Deployment**
- Terraform Lint & Format
- Security Scan
- Cost Estimation
- [ Plan Validation ](https://github.com/marketplace/actions/terraform-plan-gcp-action)
- Apply Execution
- State Backup
- Post-Deployment Tests
- Change Management Logging

### **Drift Detection & Auto-Remediation**
- Drift Detection
- Auto-Remediation
- Compliance Check
- Manual Approval for Remediation

### **CI/CD for Multi-Environment Deployments**
- Validate Changes
- Deploy to Dev
- Integration Tests
- Manual Approval for Staging
- Deploy to Staging
- Security Scan Before Prod
- Deploy to Production

### **Secret Management & Security Enforcement**
- Secrets Detection
- Secrets Rotation
- IAM Policy Review
- Dynamic Secrets Management

Stay tuned for updates as these become available.

--- 

## License
This project is licensed under the MIT License.

---

## Author
Maintained by Gus Vega: [@gusvega](https://github.com/gusvega)

For feature requests and issues, please open a GitHub Issue.

---

### Ready to use?
Use `tf-apply-gcp` in your Terraform pipelines today. Star this repository if you find it useful.


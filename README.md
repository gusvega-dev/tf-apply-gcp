# Terraform apply GCP v2

Thin apply interface over the shared [Terraform engine](https://github.com/gusvega-dev/tf-plan-apply-gcp).
The engine is pinned to an immutable commit; this repository contains no second execution implementation.

Requires a saved plan bundle, approved=true and expected-manifest-sha256 from the trusted producing job. Rejects modified, expired or mismatched plans. Never replans.

See the engine README for WIF setup, all inputs/outputs, v1 migration, artifact handling and the GuxOps integration. Raw plan artifacts may contain secrets; keep them private and short-lived. Approval belongs to the calling workflow's protected environment or GuxOps gate.

CI exercises plan, apply, no-op, destroy and empty state using Terraform's built-in terraform_data resource. No GCP resources are created.

Release new exact v2.x.y tags after CI. Never move existing version tags. Legacy v1 tags are unchanged.

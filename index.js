const core = require("@actions/core");
const { execSync } = require("child_process");
const fetch = require("node-fetch");

async function verifySubscription(subscriptionKey) {
  try {
    const apiUrl = "https://your-backend-api.com/verify-subscription"; // Replace with your API endpoint
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${subscriptionKey}`
      },
      body: JSON.stringify({ key: subscriptionKey })
    });

    const data = await response.json();
    if (response.ok && data.valid) {
      core.info("✅ Subscription verified. Proceeding...");
      return true;
    } else {
      core.setFailed("❌ Subscription verification failed. Please check your subscription.");
      return false;
    }
  } catch (error) {
    core.setFailed(`❌ Error verifying subscription: ${error.message}`);
    return false;
  }
}

async function run() {
  try {
    // Read inputs
    const gcpCredentials = core.getInput("gcp_credentials_json");
    const projectId = core.getInput("project_id");
    const environment = core.getInput("environment");
    const subscriptionKey = core.getInput("subscription_key");

    // Verify Subscription
    // const isSubscribed = await verifySubscription(subscriptionKey);
    // if (!isSubscribed) return;

    // Set Environment Variables
    core.exportVariable("GOOGLE_APPLICATION_CREDENTIALS", gcpCredentials);
    core.exportVariable("TF_VAR_secrets", JSON.stringify({ project_id: projectId }));

    // Authenticate with GCP
    execSync(`gcloud auth activate-service-account --key-file=${gcpCredentials}`, { stdio: "inherit" });

    // Run Terraform Apply
    core.info("🚀 Running Terraform Apply...");
    execSync("cd terraform && terraform init -backend=true && terraform apply -auto-approve", { stdio: "inherit" });

    core.info("✅ Terraform Apply completed successfully!");
  } catch (error) {
    core.setFailed(`🚨 Error: ${error.message}`);
  }
}

run();

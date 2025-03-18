const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process'); // Use execSync for capturing output

/**
 * Sets up the working directory based on user input.
 */
function setupWorkdir() {
    let workdir = core.getInput('workdir') || '.';
    workdir = path.join('/github/workspace', workdir); // Ensure absolute path

    console.log(`📂 Workdir provided: ${workdir}`);

    // Ensure directory exists
    if (!fs.existsSync(workdir)) {
        throw new Error(`❌ Error: Specified workdir '${workdir}' does not exist!`);
    }

    // Change to Terraform directory
    process.chdir(workdir);
    console.log(`✅ Changed to workdir: ${workdir}`);
}

/**
 * Parses secrets and sets them as Terraform environment variables.
 */
function setupSecrets() {
    let secretsInput = core.getInput('secrets') || "{}";

    try {
        const secrets = JSON.parse(secretsInput);
        console.log("🔑 Setting up secrets...");

        // Convert secrets into a single JSON string for Terraform
        const secretsJson = JSON.stringify(secrets);
        process.env["TF_VAR_secrets"] = secretsJson;
        console.log(`✅ All secrets available as 'TF_VAR_secrets'`);
    } catch (error) {
        core.setFailed(`❌ Error parsing secrets input: ${error.message}`);
    }
}

/**
 * Handles Google Cloud credentials setup if provided via environment variables.
 */
function setupGcpCredentials() {
    const gcpCredentialsPath = "/github/workspace/gcp-credentials.json";
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS; // Directly from env

    if (credentials) {
        try {
            console.log(`🔑 Writing GCP credentials to ${gcpCredentialsPath}`);
            fs.writeFileSync(gcpCredentialsPath, credentials);
            process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredentialsPath;
        } catch (error) {
            core.setFailed(`❌ Error processing GCP credentials: ${error.message}`);
        }
    } else {
        core.warning("⚠️ GOOGLE_APPLICATION_CREDENTIALS is not set in environment variables.");
    }
}

/**
 * Runs Terraform Apply and extracts deployment changes.
 */
async function runTerraform() {
    console.log("🏗 Running Terraform Init...");
    await exec.exec('terraform init -input=false -no-color', [], { silent: false });

    console.log("📊 Running Terraform Apply");
    try {
        await exec.exec('terraform apply -auto-approve -no-color -input=false', [], { silent: false });
    } catch (error) {
        core.setFailed(`❌ Terraform Apply failed: ${error.message}`);
        return;
    }

    console.log("✅ Terraform Apply completed.");
    core.setOutput("apply_status", "success");
}

/**
 * Main execution function.
 */
async function run() {
    try {
        setupWorkdir();
        setupSecrets();
        setupGcpCredentials(); // Uses GOOGLE_APPLICATION_CREDENTIALS directly
        await runTerraform();
    } catch (error) {
        core.setFailed(`Terraform Apply failed: ${error.message}`);
    }
}

run();

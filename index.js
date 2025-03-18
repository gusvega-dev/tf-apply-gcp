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

    if (!fs.existsSync(workdir)) {
        throw new Error(`❌ Error: Workdir '${workdir}' does not exist!`);
    }

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
        process.env["TF_VAR_secrets"] = JSON.stringify(secrets);
        console.log("✅ Secrets configured successfully.");
    } catch (error) {
        core.setFailed(`❌ Failed to parse secrets: ${error.message}`);
    }
}

/**
 * Handles Google Cloud credentials setup if provided via environment variables.
 */
function setupGcpCredentials() {
    const gcpCredentialsPath = "/github/workspace/gcp-credentials.json";
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (credentials) {
        try {
            console.log("🔑 Configuring GCP credentials...");
            fs.writeFileSync(gcpCredentialsPath, credentials);
            process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredentialsPath;
            console.log("✅ GCP credentials set.");
        } catch (error) {
            core.setFailed(`❌ Failed to configure GCP credentials: ${error.message}`);
        }
    } else {
        console.log("⚠️ No GCP credentials detected. Skipping setup.");
    }
}

/**
 * Runs Terraform Apply and improves logging.
 */
async function runTerraform() {
    console.log("🏗 **Initializing Terraform...**");
    try {
        console.log("::group::Terraform Init");
        await exec.exec('terraform init -input=false -no-color');
        console.log("✅ Terraform initialized successfully.");
        console.log("::endgroup::");
    } catch (error) {
        core.setFailed(`❌ Terraform Init failed: ${error.message}`);
        return;
    }

    console.log("🚀 **Applying Terraform changes...**");
    try {
        console.log("::group::Terraform Apply");
        await exec.exec('terraform apply -auto-approve -no-color -input=false');
        console.log("✅ Terraform Apply completed successfully.");
        console.log("::endgroup::");
    } catch (error) {
        core.setFailed(`❌ Terraform Apply failed: ${error.message}`);
        return;
    }

    core.setOutput("apply_status", "success");
}

/**
 * Main execution function.
 */
async function run() {
    try {
        console.log("🛠 **Starting Terraform Apply Workflow...**");
        setupWorkdir();
        setupSecrets();
        setupGcpCredentials();
        await runTerraform();
        console.log("🎉 **Terraform Apply workflow completed successfully!**");
    } catch (error) {
        core.setFailed(`🔥 Terraform Apply Workflow Failed: ${error.message}`);
    }
}

run();

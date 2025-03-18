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
    await exec.exec('terraform init -input=false', [], { silent: false });

    // Check if a plan exists
    const planExists = fs.existsSync("tfplan");

    if (!planExists) {
        console.log("🤔 Thinking... (Generating Terraform Plan)");
        try {
            await exec.exec('terraform plan -out=tfplan', [], { silent: true }); // Plan runs silently
        } catch (error) {
            core.setFailed(`❌ Terraform Plan failed: ${error.message}`);
            return;
        }
        console.log("✅ Plan generated.");
    }

    console.log("📊 Showing Terraform Plan Before Apply...");
    try {
        const planOutput = execSync('terraform show tfplan', { encoding: 'utf8' });
        console.log(planOutput); // Display changes before apply
    } catch (error) {
        core.setFailed(`❌ Failed to show Terraform plan: ${error.message}`);
        return;
    }

    console.log("📢 **The above plan will be applied now...**");

    console.log("📊 Running Terraform Apply...");
    try {
        await exec.exec('terraform apply tfplan', [], { silent: false }); // Apply using the saved plan
    } catch (error) {
        core.setFailed(`❌ Terraform Apply failed: ${error.message}`);
        return;
    }

    console.log("📝 Extracting Applied Changes...");
    const jsonOutputPath = "/github/workspace/tfapply.json";

    try {
        const jsonOutput = execSync('terraform show -json', { encoding: 'utf8' });
        fs.writeFileSync(jsonOutputPath, jsonOutput);
    } catch (error) {
        core.setFailed(`❌ Failed to generate Terraform JSON output: ${error.message}`);
        return;
    }

    // Read and parse the JSON output
    if (fs.existsSync(jsonOutputPath)) {
        const tfJson = JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'));

        // Extract resource changes
        const changes = tfJson.resource_changes || [];
        const changesCount = changes.length;

        // Categorize resources by action type
        const changeCategories = {
            create: [],
            update: [],
            delete: []
        };

        function formatAttributes(attributes, indentLevel = 2) {
            return Object.entries(attributes)
                .map(([key, value]) => {
                    const indent = " ".repeat(indentLevel);
                    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                        return `${indent}- ${key}:\n` + formatAttributes(value, indentLevel + 2);
                    } else {
                        return `${indent}- ${key}: ${JSON.stringify(value)}`;
                    }
                })
                .join("\n");
        }

        changes.forEach(change => {
            const address = change.address; // Full resource path
            const actions = change.change.actions; // Array of actions (["create"], ["update"], ["delete"])

            // Extract attributes and format them properly
            const attributes = change.change.after || {};
            const formattedAttributes = formatAttributes(attributes, 8); // Start indentation at 8 spaces

            actions.forEach(action => {
                if (changeCategories[action]) {
                    changeCategories[action].push({ address, formattedAttributes });
                }
            });
        });

        const createCount = changeCategories.create.length;
        const updateCount = changeCategories.update.length;
        const deleteCount = changeCategories.delete.length;

        // Print summary
        console.log("🔄 Terraform Apply Changes:");
        console.log(`🔍 Found ${changesCount} resource changes.`);
        console.log(" ");
        console.log(`CREATE: ${createCount} | UPDATE: ${updateCount} | DELETE: ${deleteCount}\n`);

        const actionLabels = {
            create: "CREATE",
            update: "UPDATE",
            delete: "DELETE"
        };

        ["create", "update", "delete"].forEach(action => {
            if (changeCategories[action].length > 0) {
                console.log(`${actionLabels[action]}:`);

                changeCategories[action].forEach(resource => {
                    // ✅ Resource is collapsible in GitHub Actions logs
                    console.log(`::group::${resource.address}`);
                    console.log(resource.formattedAttributes);
                    console.log("::endgroup::");
                });

                console.log(""); // Add empty line for spacing
            }
        });

        // Set GitHub Actions outputs
        core.setOutput("resources_changed", changesCount);
        core.setOutput("change_details", JSON.stringify(changeCategories));
    } else {
        console.log("⚠️ No Terraform JSON output found.");
        core.setOutput("resources_changed", 0);
    }

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
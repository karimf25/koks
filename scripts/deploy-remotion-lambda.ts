/**
 * Provisions Remotion Lambda for the Weekly Recap export, then prints the
 * env vars to add to .env.local and Vercel.
 *
 * Prereqs: an AWS account + an IAM user with the Remotion Lambda policy
 * (see https://remotion.dev/docs/lambda/setup). Provide its credentials via:
 *   REMOTION_AWS_ACCESS_KEY_ID, REMOTION_AWS_SECRET_ACCESS_KEY
 * (or the standard AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY).
 *
 * Run: npx tsx scripts/deploy-remotion-lambda.ts
 */
import path from "path";
import { deployFunction, deploySite, getOrCreateBucket } from "@remotion/lambda";

const REGION = (process.env.REMOTION_LAMBDA_REGION ?? "eu-west-1") as never;
const SITE_NAME = "lifeos-recap";

async function main() {
  // Mirror REMOTION_AWS_* into the names the SDK reads, if provided that way.
  if (process.env.REMOTION_AWS_ACCESS_KEY_ID && !process.env.AWS_ACCESS_KEY_ID) {
    process.env.AWS_ACCESS_KEY_ID = process.env.REMOTION_AWS_ACCESS_KEY_ID;
  }
  if (process.env.REMOTION_AWS_SECRET_ACCESS_KEY && !process.env.AWS_SECRET_ACCESS_KEY) {
    process.env.AWS_SECRET_ACCESS_KEY = process.env.REMOTION_AWS_SECRET_ACCESS_KEY;
  }

  console.log("Deploying Lambda function…");
  const { functionName } = await deployFunction({
    region: REGION,
    timeoutInSeconds: 120,
    memorySizeInMb: 2048,
    diskSizeInMb: 2048,
    createCloudWatchLogGroup: true,
  });
  console.log("  function:", functionName);

  console.log("Ensuring S3 bucket…");
  const { bucketName } = await getOrCreateBucket({ region: REGION });
  console.log("  bucket:", bucketName);

  console.log("Uploading site bundle…");
  const { serveUrl } = await deploySite({
    region: REGION,
    bucketName,
    entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
    siteName: SITE_NAME,
  });
  console.log("  serveUrl:", serveUrl);

  console.log("\n✅ Done. Add these to .env.local AND Vercel (then redeploy):\n");
  console.log(`REMOTION_LAMBDA_REGION=${REGION}`);
  console.log(`REMOTION_LAMBDA_FUNCTION_NAME=${functionName}`);
  console.log(`REMOTION_SERVE_URL=${serveUrl}`);
  console.log(`REMOTION_AWS_ACCESS_KEY_ID=<your IAM access key id>`);
  console.log(`REMOTION_AWS_SECRET_ACCESS_KEY=<your IAM secret access key>`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

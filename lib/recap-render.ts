import "server-only";

// Thin wrapper around Remotion Lambda. Kept isolated so the heavy
// @remotion/lambda import is only pulled into the two render routes.
//
// Required env vars (set after `remotion lambda` provisioning — see
// HANDOFF.md / IMPROVEMENTS.md):
//   REMOTION_AWS_ACCESS_KEY_ID
//   REMOTION_AWS_SECRET_ACCESS_KEY
//   REMOTION_LAMBDA_FUNCTION_NAME   e.g. remotion-render-4-0-476-mem2048mb-disk2048mb-120sec
//   REMOTION_SERVE_URL              the S3 site URL from `remotion lambda sites create`
//   REMOTION_LAMBDA_REGION          optional, defaults to eu-west-1 (matches the DB region)

export const RECAP_COMPOSITION_ID = "WeeklyRecap";

export function getLambdaConfig() {
  const region = (process.env.REMOTION_LAMBDA_REGION ?? "eu-west-1") as
    | "eu-west-1"
    | "us-east-1"
    | string;
  const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
  const serveUrl = process.env.REMOTION_SERVE_URL;
  const accessKeyId = process.env.REMOTION_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.REMOTION_AWS_SECRET_ACCESS_KEY;
  return { region, functionName, serveUrl, accessKeyId, secretAccessKey };
}

export function isRenderConfigured(): boolean {
  const c = getLambdaConfig();
  return !!(c.functionName && c.serveUrl && c.accessKeyId && c.secretAccessKey);
}

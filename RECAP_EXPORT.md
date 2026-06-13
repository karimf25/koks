# Weekly Recap — MP4 Export Setup

The recap **plays** in the browser with no setup. To enable the **Download MP4**
button (server-side rendering of a real video file), you provision Remotion
Lambda on AWS once, then add five env vars. Until then the button shows
"Cloud export not set up yet" and is disabled — nothing else is affected.

Why Lambda and not Vercel: rendering a video needs headless Chromium and a
minute of compute, which Vercel's serverless functions can't do. Remotion
Lambda is the supported way; it costs a few cents per render and nothing when
idle.

## One-time AWS setup (~15 min)

1. **Create an AWS account** at https://aws.amazon.com (free to create; you only
   pay per render — typically < $0.01 for this 18-second clip).

2. **Create an IAM user for Remotion** following the official, copy-paste guide:
   https://www.remotion.dev/docs/lambda/setup
   - It walks you through creating a user, attaching the Remotion role
     permissions, and the `remotion-policy` JSON.
   - Save the **Access key ID** and **Secret access key**.

3. **Put the AWS keys in your shell**, then deploy from the `lifeos/` folder:

   ```bash
   # PowerShell
   $env:REMOTION_AWS_ACCESS_KEY_ID="AKIA..."
   $env:REMOTION_AWS_SECRET_ACCESS_KEY="..."
   npm run recap:deploy
   ```

   This deploys the Lambda function, creates the S3 bucket, uploads the recap
   site bundle, and prints the exact env vars to set next. (Region defaults to
   `eu-west-1` to match the database; override with `REMOTION_LAMBDA_REGION`.)

## Env vars to add (`.env.local` AND Vercel → redeploy)

```
REMOTION_LAMBDA_REGION=eu-west-1
REMOTION_LAMBDA_FUNCTION_NAME=remotion-render-4-0-476-mem2048mb-disk2048mb-120sec
REMOTION_SERVE_URL=https://remotionlambda-euwest1-xxxx.s3.eu-west-1.amazonaws.com/sites/lifeos-recap/index.html
REMOTION_AWS_ACCESS_KEY_ID=AKIA...
REMOTION_AWS_SECRET_ACCESS_KEY=...
```

(`recap:deploy` prints the real function name and serve URL — copy those.)

After setting them in Vercel, **redeploy**. The Download button on `/recap`
goes live; clicking it renders the current week's video on Lambda, shows live
progress, and downloads the MP4 when done.

## Updating the video design later

If you change `app/(app)/recap/_components/RecapComposition.tsx`, re-upload the
site bundle so Lambda renders the new version:

```bash
npm run recap:deploy   # re-runs deploySite; function/bucket are reused
```

## Local rendering (no AWS needed)

You can always render locally for a one-off file:

```bash
npm run recap:render          # → out/recap.mp4 (uses the sample week data)
npm run recap:studio          # opens Remotion Studio to preview/scrub
```

The in-app button renders the *real* selected week; the local script uses the
sample data in `remotion/sample-data.ts`.

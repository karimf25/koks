import { NextRequest, NextResponse } from "next/server";
import { isRenderConfigured, getLambdaConfig } from "@/lib/recap-render";

// Polls the progress of a Remotion Lambda render. Returns
// { done, progress, url?, error? }.
export async function GET(request: NextRequest) {
  if (!isRenderConfigured()) {
    return NextResponse.json({ error: "Video export is not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const renderId = searchParams.get("renderId");
  const bucketName = searchParams.get("bucketName");
  if (!renderId || !bucketName) {
    return NextResponse.json({ error: "renderId and bucketName are required" }, { status: 400 });
  }

  try {
    const { region, functionName, accessKeyId, secretAccessKey } = getLambdaConfig();
    const { getRenderProgress } = await import("@remotion/lambda/client");

    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName: functionName!,
      region: region as never,
      ...(accessKeyId && secretAccessKey
        ? { awsAccessKeyId: accessKeyId, awsSecretAccessKey: secretAccessKey }
        : {}),
    } as never);

    if (progress.fatalErrorEncountered) {
      return NextResponse.json({
        done: false,
        progress: 0,
        error: progress.errors?.[0]?.message ?? "Render failed",
      });
    }

    return NextResponse.json({
      done: progress.done,
      progress: progress.overallProgress,
      url: progress.outputFile ?? null,
    });
  } catch (err) {
    console.error("recap progress error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

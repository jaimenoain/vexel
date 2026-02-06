import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { file_path, asset_id, user_id } = body;

    if (!file_path || !asset_id || !user_id) {
      return NextResponse.json(
        { error: "Missing required fields: file_path, asset_id, user_id" },
        { status: 400 }
      );
    }

    await inngest.send({
      name: "airlock/document.uploaded",
      data: {
        file_path,
        asset_id,
        user_id,
      },
    });

    return NextResponse.json({ success: true, message: "Job enqueued" });
  } catch (error) {
    console.error("Error enqueuing job:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

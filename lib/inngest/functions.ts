import { inngest } from "./client";
import { supabaseAdmin } from "../supabase-admin";
import { ParserFactory } from "../ai/factory";
import { gradeAirlockItem } from "../airlock/traffic-light";
import { ExtractedData } from "../ai/types";
import { Readable } from "stream";

// Define the event type
type DocumentUploadedEvent = {
  data: {
    file_path: string;
    asset_id: string;
    user_id: string;
    airlock_item_id?: string;
  };
};

// Helper function to update status
export async function updateItemStatus(id: string, status: string, errorMessage?: string) {
  const updatePayload: any = { status };
  if (errorMessage) {
    updatePayload.ai_payload = { error: errorMessage };
  }

  const { error } = await supabaseAdmin
    .from('airlock_items')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    console.error("Error updating airlock_items status:", error);
    throw new Error(`Failed to update status: ${error.message}`);
  }
}

export const processDocumentHandler = async ({ event, step }: { event: DocumentUploadedEvent; step: any }) => {
  const { file_path, asset_id, airlock_item_id } = event.data;

  await step.run("log-start", async () => {
    console.log(`Job Started for Asset [${asset_id}] File [${file_path}]`);
  });

  // Resolve Item ID
  const resolvedItemId = await step.run("resolve-item-id", async () => {
    if (airlock_item_id) return airlock_item_id;

    const { data, error } = await supabaseAdmin
      .from('airlock_items')
      .select('id')
      .eq('asset_id', asset_id)
      .eq('file_path', file_path)
      .maybeSingle();

    if (error) {
      throw new Error(`Database error resolving item: ${error.message}`);
    }
    if (!data) {
      throw new Error(`No airlock_items found for asset_id: ${asset_id} and file_path: ${file_path}`);
    }
    return data.id;
  });

  try {
    await step.run("update-status-processing", async () => {
      await updateItemStatus(resolvedItemId, 'PROCESSING');
    });

    const extractionData = await step.run("parse-document", async () => {
      // Download file
      const { data, error } = await supabaseAdmin.storage
        .from('raw-documents')
        .download(file_path);

      if (error || !data) {
        throw new Error(`Download failed: ${error?.message || 'Unknown error'}`);
      }

      // Convert Blob to Stream
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const stream = Readable.from(buffer);

      // Determine MIME type
      const mimeType = file_path.toLowerCase().endsWith('.csv') ? 'text/csv' : 'application/pdf';

      // Parse
      const parser = ParserFactory.getParser();
      return await parser.parse(stream, mimeType);
    });

    await step.run("save-results", async () => {
      // Calculate aggregate confidence score
      let confidenceScore = 0;
      if (Array.isArray(extractionData) && extractionData.length > 0) {
        const totalConfidence = extractionData.reduce((sum: number, item: ExtractedData) => sum + item.confidence, 0);
        confidenceScore = totalConfidence / extractionData.length;
      }

      // Determine Traffic Light status
      const payload = { transactions: extractionData };
      const trafficLightStatus = gradeAirlockItem(payload, confidenceScore);

      const { error } = await supabaseAdmin
        .from('airlock_items')
        .update({
          status: 'REVIEW_NEEDED',
          ai_payload: payload,
          confidence_score: confidenceScore,
          traffic_light: trafficLightStatus
        })
        .eq('id', resolvedItemId);

      if (error) {
        throw new Error(`Failed to save results: ${error.message}`);
      }
    });

  } catch (err: any) {
    await step.run("handle-error", async () => {
      console.error(`Processing failed for item ${resolvedItemId}:`, err);
      await updateItemStatus(resolvedItemId, 'ERROR', err.message || 'Unknown error');
    });
    // We do not rethrow to avoid infinite retries on logic/data errors
    // But for transient errors, retries would be good.
    // Current logic treats all errors as fatal and updates status to ERROR.
  }

  return { success: true, itemId: resolvedItemId };
};

export const processDocument = inngest.createFunction(
  { id: "process-document" },
  { event: "airlock/document.uploaded" },
  processDocumentHandler
);

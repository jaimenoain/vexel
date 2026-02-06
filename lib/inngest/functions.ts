import { inngest } from "./client";
import { supabase } from "../supabase";

// Define the event type
type DocumentUploadedEvent = {
  data: {
    file_path: string;
    asset_id: string;
    user_id: string;
  };
};

// Extracted logic for easier testing
export async function updateItemStatus(asset_id: string, file_path: string, status: string) {
  const { data, error } = await supabase
    .from('airlock_items')
    .update({ status })
    .eq('asset_id', asset_id)
    .eq('file_path', file_path)
    .select();

  if (error) {
    console.error("Error updating airlock_items status:", error);
    throw new Error(`Failed to update status: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn(`No airlock_items found for asset_id: ${asset_id} and file_path: ${file_path}`);
  }
}

export const processDocument = inngest.createFunction(
  { id: "process-document" },
  { event: "airlock/document.uploaded" },
  async ({ event, step }: { event: DocumentUploadedEvent; step: any }) => {
    const { file_path, asset_id, user_id } = event.data;

    await step.run("log-start", async () => {
      console.log(`Job Started for Asset [${asset_id}]`);
    });

    await step.run("update-status", async () => {
      await updateItemStatus(asset_id, file_path, 'PROCESSING');
    });

    await step.run("wait-mock", async () => {
      // Mock duration of 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    return { success: true, asset_id };
  }
);

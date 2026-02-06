import { TrafficLight } from '../types';
import { ExtractedData } from '../ai/types';
import { supabaseAdmin } from '../supabase-admin';
import { gradeAirlockItem } from './grading-logic';

export { gradeAirlockItem };

export async function updateTrafficLightStatus(
  itemId: string,
  status: TrafficLight,
  confidence: number
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('airlock_items')
    .update({
      traffic_light: status,
      confidence_score: confidence
    })
    .eq('id', itemId);

  if (error) {
    throw new Error(`Failed to update traffic light status: ${error.message}`);
  }
}

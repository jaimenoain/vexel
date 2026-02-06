import { updateItemStatus } from '../functions';
import { supabase } from '../../supabase';

// Mock supabase client
jest.mock('../../supabase', () => {
  const mockSelect = jest.fn();
  const mockEq = jest.fn();
  const mockUpdate = jest.fn();

  // Chain setup
  const mockChain = {
      update: mockUpdate,
      eq: mockEq,
      select: mockSelect
  };

  // Make methods return the chain
  mockUpdate.mockReturnValue(mockChain);
  mockEq.mockReturnValue(mockChain);

  return {
    supabase: {
      from: jest.fn(() => mockChain),
    },
  };
});

describe('updateItemStatus', () => {
  it('should call supabase update with correct parameters', async () => {
    // Setup mock return
    const mockSelect = supabase.from('airlock_items').update({}).eq('', '').select as jest.Mock;
    mockSelect.mockResolvedValue({
      data: [{ id: '1' }],
      error: null,
    });

    await updateItemStatus('asset-123', 'file.pdf', 'PROCESSING');

    expect(supabase.from).toHaveBeenCalledWith('airlock_items');

    // Check update call
    // access the chain object implicitly via the mock calls
    // It's easier to check if the mocked function was called.
    const mockChain = (supabase.from as jest.Mock).mock.results[0].value;

    expect(mockChain.update).toHaveBeenCalledWith({ status: 'PROCESSING' });
    expect(mockChain.eq).toHaveBeenCalledWith('asset_id', 'asset-123');
    expect(mockChain.eq).toHaveBeenCalledWith('file_path', 'file.pdf');
    expect(mockChain.select).toHaveBeenCalled();
  });

  it('should log warning if no items found', async () => {
    const mockSelect = supabase.from('airlock_items').update({}).eq('', '').select as jest.Mock;
    mockSelect.mockResolvedValue({
      data: [],
      error: null,
    });

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    await updateItemStatus('asset-123', 'file.pdf', 'PROCESSING');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No airlock_items found'));
    consoleSpy.mockRestore();
  });
});

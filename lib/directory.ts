import { Entity, Asset, EntityType, AssetType } from './types';

export function buildDirectoryTree(data: any[]): Entity[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item: any) => {
    // Ensure nested assets array exists
    const rawAssets = Array.isArray(item.assets) ? item.assets : [];

    const assets: Asset[] = rawAssets.map((asset: any) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type as AssetType,
      currency: asset.currency,
      net_worth: 0, // Injected placeholder as per requirement
    }));

    const entity: Entity = {
      id: item.id,
      name: item.name,
      type: item.type as EntityType,
      assets: assets,
    };

    return entity;
  });
}

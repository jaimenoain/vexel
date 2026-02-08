import Link from 'next/link';
import { Asset } from '@/lib/types';

export function AssetRow({ asset }: { asset: Asset }) {
  return (
    <Link href={`/portfolio/${asset.id}`} className="block border-t border-[#E5E5E5] hover:bg-[#F5F5F5] transition-colors">
      <div className="py-3 pl-8 pr-4 text-sm text-[#111111]">
        {asset.name}
      </div>
    </Link>
  );
}

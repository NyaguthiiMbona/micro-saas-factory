import React from 'react';

interface AdSlotProps {
  position: 'top' | 'sidebar' | 'bottom';
  clientKey?: string;
  slotId?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ position, clientKey, slotId }) => {
  return (
    <div className="my-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 min-h-[100px]">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Advertisement / Sponsored
      </span>
      {clientKey && slotId ? (
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={clientKey}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <p className="text-xs text-gray-400">Ad Slot Placeholder ({position})</p>
      )}
    </div>
  );
};

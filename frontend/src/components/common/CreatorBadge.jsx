/**
 * CreatorBadge — shows the name of the user who created a record.
 * Visible only to admins. Renders a small avatar + tooltip on hover.
 *
 * Usage:
 *   <CreatorBadge creatorName="João Silva" />
 */
export default function CreatorBadge({ creatorName }) {
  if (!creatorName) return null;

  const initial = creatorName.charAt(0).toUpperCase();

  return (
    <div className="relative group inline-flex">
      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center text-xs font-bold cursor-default select-none">
        {initial}
      </div>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex items-center whitespace-nowrap z-50">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg">
          {creatorName}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    </div>
  );
}

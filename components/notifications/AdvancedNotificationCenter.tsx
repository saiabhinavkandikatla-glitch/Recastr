export function AdvancedNotificationCenter() {
  return (
    <div className="rounded-[32px] border border-[#232323] bg-[#151515] p-8">
      <h2 className="text-2xl font-semibold text-white">
        Notifications
      </h2>
      <div className="mt-8 space-y-5">
        <div className="rounded-2xl bg-[#111111] p-5">
          <p className="text-white">
            AI generation completed
          </p>
          <p className="mt-2 text-sm text-[#8A8A8A]">
            Just now
          </p>
        </div>
        <div className="rounded-2xl bg-[#111111] p-5">
          <p className="text-white">
            Team member joined workspace
          </p>
          <p className="mt-2 text-sm text-[#8A8A8A]">
            10 min ago
          </p>
        </div>
      </div>
    </div>
  );
}

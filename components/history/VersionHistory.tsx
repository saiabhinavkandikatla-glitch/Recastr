const versions = [
  "Version 5",
  "Version 4",
  "Version 3",
  "Version 2"
];

export function VersionHistory() {
  return (
    <div className="rounded-[32px] border border-[#232323] bg-[#151515] p-8">
      <h2 className="text-2xl font-semibold text-white">
        Version History
      </h2>
      <div className="mt-8 space-y-4">
        {versions.map((version) => (
          <div
            key={version}
            className="rounded-2xl bg-[#111111] p-5 text-white"
          >
            {version}
          </div>
        ))}
      </div>
    </div>
  );
}

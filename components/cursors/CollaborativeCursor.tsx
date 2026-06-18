interface Props {
  name: string;
}

export function CollaborativeCursor({ name }: Props) {
  return (
    <div className="absolute">
      <div className="h-5 w-5 rounded-full bg-white" />
      <div className="mt-1 rounded-xl bg-white px-3 py-1 text-xs text-black">
        {name}
      </div>
    </div>
  );
}

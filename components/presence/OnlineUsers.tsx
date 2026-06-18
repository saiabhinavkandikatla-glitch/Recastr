const users = ["A", "S", "J", "M"];

export function OnlineUsers() {
  return (
    <div className="flex -space-x-3">
      {users.map((user) => (
        <div
          key={user}
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#090909] bg-[#151515] text-white"
        >
          {user}
        </div>
      ))}
    </div>
  );
}

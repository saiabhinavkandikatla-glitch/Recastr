export function Footer() {
  const links = [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "Docs", href: "/docs" },
    { name: "Blog", href: "/blog" },
    { name: "Privacy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <footer className="border-t border-[#232323] py-16 bg-[#090909]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-6 md:flex-row">
        
        <div className="flex flex-col items-center md:items-start">
          <h3 className="text-xl font-semibold text-white">
            Recastr
          </h3>
          <p className="mt-3 text-sm text-[#8A8A8A]">
            Create 30 content assets from one video.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-sm text-[#8A8A8A] md:justify-end">
          {links.map((link, index) => (
            <div key={link.name} className="flex items-center gap-6">
              <a 
                href={link.href} 
                className="transition-colors duration-200 hover:text-white"
              >
                {link.name}
              </a>
              {index < links.length - 1 && (
                <span className="hidden h-4 w-px bg-[#232323] md:block" />
              )}
            </div>
          ))}
        </div>

      </div>
    </footer>
  );
}

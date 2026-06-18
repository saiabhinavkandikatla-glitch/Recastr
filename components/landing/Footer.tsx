export function Footer() {
  return (
    <footer className="border-t border-[#232323] py-16">

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-6 md:flex-row">

        <div>
          <h3 className="text-xl font-semibold">
            Recastr
          </h3>

          <p className="mt-3 text-[#8A8A8A]">
            Create 30 content assets from one video.
          </p>
        </div>

        <div className="flex gap-8 text-[#8A8A8A]">

          <a href="#">
            Features
          </a>

          <a href="#">
            Pricing
          </a>

          <a href="#">
            Docs
          </a>

          <a href="#">
            Blog
          </a>

        </div>

      </div>
    </footer>
  );
}

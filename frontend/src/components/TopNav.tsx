
export default function TopNav() {
  return (
<header className="fixed top-0 right-0 w-[calc(100%-280px)] h-16 bg-surface dark:bg-surface-dim border-b border-outline-variant dark:border-outline flex justify-between items-center px-gutter z-40">
<div className="flex items-center gap-4">
<div className="relative group">
<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">search</span>
<input className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-body-sm w-80 focus:ring-2 focus:ring-primary-container outline-none transition-all" placeholder="Search railway assets..." type="text"/>
</div>
</div>
<div className="flex items-center gap-6">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary">cloud_done</span>
<span className="font-label-md text-label-md text-on-surface-variant">Systems Nominal</span>
</div>
</div>
</header>
  );
}

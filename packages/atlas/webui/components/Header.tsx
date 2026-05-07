import Link from "next/link";
import { Network } from "lucide-react";
import { SearchBar } from "./SearchBar";

export function Header() {
  return (
    <header className="atlas-header">
      <div className="atlas-header__running">
        <Link href="/" className="atlas-header__brand">
          <Network style={{ width: 22, height: 22 }} />
          <div>
            <strong>Atlas</strong>
            <span>graph folios</span>
          </div>
        </Link>
        <nav className="atlas-header__nav">
          <Link href="/wiki">Wiki</Link>
          <Link href="/graph">Graph</Link>
          <Link href="/edges">Edges</Link>
          <Link href="/search">Search</Link>
        </nav>
      </div>

      <div className="atlas-header__toolbar">
        <div className="atlas-header__title">
          <small>Compendium codex shell</small>
          <p>Atlas records, references, and linked articles rendered as designed folios instead of generic app chrome.</p>
        </div>
        <div className="atlas-header__search">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}

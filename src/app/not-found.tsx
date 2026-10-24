import Link from "next/link";
export default function NotFound() {
  return (
    <div className="wrap page-wrap empty-state">
      <span className="eyebrow">404 / A SMALL DETOUR</span>
      <h1>This page is out of range.</h1>
      <p>The link may have changed, or the page hasn’t been written yet.</p>
      <Link className="button-primary" href="/writing/">
        Back to the writing →
      </Link>
    </div>
  );
}

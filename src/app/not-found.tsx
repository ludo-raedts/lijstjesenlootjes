import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell narrow page-section center">
      <span className="eyebrow">404</span>
      <h1>Deze pagina is er niet meer.</h1>
      <p className="lead">De link is mogelijk onvolledig, verlopen of ingetrokken.</p>
      <Link className="button" href="/">Naar de homepage</Link>
    </div>
  );
}

import { Link } from "react-router";

export function NotFoundRoute() {
  return (
    <section className="m-auto flex flex-col items-center gap-2 text-center">
      <h1 className="text-2xl">Nothing kept here</h1>
      <Link to="/" className="text-sm text-link underline-offset-4 hover:underline">
        Back to your moments
      </Link>
    </section>
  );
}

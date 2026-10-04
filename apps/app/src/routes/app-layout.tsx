import { Link, Outlet } from "react-router";

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-heading text-xl font-bold tracking-tight text-foreground">
            Ámbar
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Moments
            </Link>
            <Link to="/login" className="hover:text-foreground">
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}

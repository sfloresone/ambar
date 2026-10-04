import type { FormEvent } from "react";
import { Button } from "@ambar/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ambar/ui/components/card";
import { Input } from "@ambar/ui/components/input";
import { Label } from "@ambar/ui/components/label";

function handleSubmit(event: FormEvent<HTMLFormElement>) {
  // No backend yet: the AuthClient from @ambar/core will be wired to apps/api.
  event.preventDefault();
}

export function LoginRoute() {
  return (
    <section className="m-auto w-full max-w-sm px-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl tracking-tight">Sign in to Ámbar</h1>
          </CardTitle>
          <CardDescription>We will send a link to your email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <Button type="submit">Continue</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

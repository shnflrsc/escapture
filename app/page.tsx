import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getUser, homeFor } from "@/server/auth";

async function Go(): Promise<never> {
  const user = await getUser();
  redirect(user ? homeFor(user.role) : "/sign-in");
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Go />
    </Suspense>
  );
}

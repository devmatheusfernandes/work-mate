import { SignInCard } from "./_components/SignInCard";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black p-4 md:p-8">
      <div className="w-full max-w-[420px]">
        <SignInCard />
      </div>
    </div>
  );
}
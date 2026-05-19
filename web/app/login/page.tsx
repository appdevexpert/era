import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/login-form";

import eraLogo from "@/assets/images/ERA.png";
import loginImage from "@/assets/images/login.png";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          <Link href="/" className="flex flex-col items-start gap-0.5">
            <Image
              src={eraLogo}
              alt="ERA"
              priority
              className="h-7 w-auto object-contain"
            />
            <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-era-gold-dark">
              Admin
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src={loginImage}
          alt="ERA"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 0"
          className="object-cover"
        />
      </div>
    </div>
  );
}

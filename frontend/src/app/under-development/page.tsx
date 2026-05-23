import Link from "next/link";

export default function UnderDevelopmentPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 py-20 font-inter pr-4 animate-fade-in h-full min-h-[60vh]">
      <div className="bg-[#fde8e8] w-20 h-20 rounded-full flex items-center justify-center mb-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="#f05138" strokeWidth="2" className="w-10 h-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1c1c1c] tracking-tight">
        Under Development
      </h3>
      <p className="text-sm sm:text-base text-[#7c7c7c] max-w-[380px] leading-relaxed font-semibold">
        We are actively working on building this feature. It will be available in an upcoming update!
      </p>
      <Link href="/" className="bg-[#121212] hover:bg-[#2c2c2c] text-white py-3.5 px-8 rounded-full font-bold text-sm shadow-sm mt-4 transition-transform hover:scale-[1.02] active:scale-[0.98]">
        Back to Dashboard
      </Link>
    </div>
  );
}

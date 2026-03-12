import { CaptainSidebar } from "@/components/layout/CaptainSidebar"

export default function CaptainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <CaptainSidebar />
      <main className="md:ml-64 p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}

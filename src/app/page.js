// src/app/page.js
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <h1 className="text-4xl font-bold mb-8">Event Invitation App</h1>
      <Link 
        href="/login" 
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full transition"
      >
        出展者ログイン画面へ
      </Link>
    </div>
  )
}
// src/app/login/page.js
'use client' // クライアントサイドで動くことを宣言

import { useState } from 'react'
import { supabase } from '@/utils/supabaseClient' // 作った接続ツールを読み込み
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  // ログインボタンを押した時の処理
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    // Supabaseに問い合わせ
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg('ログインに失敗しました: ' + error.message)
      setLoading(false)
    } else {
      // 成功したら管理画面へ移動
      router.push('/admin')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">出展者ログイン</h1>
        
        {errorMsg && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input
              type="email"
              required
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <input
              type="password"
              required
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? '処理中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
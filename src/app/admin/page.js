'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  
  // フォーム入力用
  const [newGuestName, setNewGuestName] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ■ 初期データ読み込み
  useEffect(() => {
    const init = async () => {
      // 1. ログインチェック
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const currentUser = session.user
      setUser(currentUser)

      // 2. 出展者プロフィールの確認・作成 (初回のみ)
      // これがないと招待客登録時にエラーになるため、なければ自動で作ります
      const { data: exhibitor } = await supabase
        .from('exhibitors')
        .select('id')
        .eq('id', currentUser.id)
        .single()

      if (!exhibitor) {
        await supabase.from('exhibitors').insert({
          id: currentUser.id,
          company_name: '未設定の会社', // 後で編集機能をつけるとして、一旦仮置き
          email: currentUser.email
        })
      }

      // 3. 招待客リストの取得
      fetchGuests(currentUser.id)
    }

    init()
  }, [router])

  // ■ 招待客リストをDBから取得する関数
  const fetchGuests = async (userId) => {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('exhibitor_id', userId)
      .order('created_at', { ascending: false })
    
    if (data) setGuests(data)
    setLoading(false)
  }

  // ■ 招待客を追加する関数
  const handleAddGuest = async (e) => {
    e.preventDefault()
    if (!newGuestName) return
    setIsSubmitting(true)

    const { error } = await supabase.from('guests').insert({
      exhibitor_id: user.id,
      guest_name: newGuestName,
      company_name: newCompanyName,
      status: 'invited'
    })

    if (error) {
      alert('エラーが発生しました: ' + error.message)
    } else {
      // フォームをクリアしてリストを再取得
      setNewGuestName('')
      setNewCompanyName('')
      fetchGuests(user.id)
    }
    setIsSubmitting(false)
  }

  // ■ ログアウト関数
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">読み込み中...</div>

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-gray-800">
      
      {/* === サイドバー === */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-800">
          <div className="font-bold text-white tracking-wider text-lg">EVENT MANAGER</div>
        </div>
        <nav className="flex-1 p-4 space-y-2 text-sm">
          <a href="#" className="block bg-blue-600 text-white px-4 py-3 rounded-lg font-medium shadow">
            招待客リスト
          </a>
          <div className="px-4 py-3 text-slate-500 cursor-not-allowed">会社情報設定 (準備中)</div>
        </nav>
        <div className="p-4 border-t border-slate-800 text-xs">
          <p className="text-slate-500 mb-2">Login as:</p>
          <p className="text-white truncate">{user?.email}</p>
          <button onClick={handleLogout} className="mt-3 text-red-400 hover:text-red-300 underline">ログアウト</button>
        </div>
      </aside>

      {/* === メインコンテンツ === */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* ヘッダー (スマホ用ログアウトボタン等) */}
        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">招待客管理</h1>
          <button onClick={handleLogout} className="md:hidden text-sm text-red-500 border border-red-500 px-3 py-1 rounded">ログアウト</button>
        </header>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-auto p-6">
          
          {/* 新規登録フォーム */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">＋</span>
              新規招待登録
            </h2>
            <form onSubmit={handleAddGuest} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-600 mb-1">会社名</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="(株) サンプル商事"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-600 mb-1">氏名 <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="山田 太郎"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded hover:bg-blue-700 transition disabled:opacity-50 w-full md:w-auto"
              >
                {isSubmitting ? '登録中...' : '登録する'}
              </button>
            </form>
          </div>

          {/* リスト表示 */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-700">登録済みゲスト ({guests.length}名)</h3>
            </div>
            
            {guests.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                まだ招待客が登録されていません。<br/>上のフォームから登録してみましょう。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">会社名</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">氏名</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">ステータス</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">招待状URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {guests.map((guest) => (
                      <tr key={guest.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-600">{guest.company_name}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{guest.guest_name} 様</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            guest.status === 'checked_in' ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'
                          }`}>
                            {guest.status === 'checked_in' ? '来場済み' : '招待中'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                           <a 
                             href={`/invite/${guest.id}`} 
                             target="_blank" 
                             className="text-blue-600 hover:underline flex items-center gap-1"
                           >
                             確認する ↗
                           </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
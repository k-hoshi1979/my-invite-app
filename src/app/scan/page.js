'use client'
import { useState, useEffect, useRef } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { supabase } from '@/utils/supabaseClient'
import Link from 'next/link'

export default function ScanPage() {
  const [scanResult, setScanResult] = useState(null) 
  const [guestData, setGuestData] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  
  const [manualInput, setManualInput] = useState('')
  const inputRef = useRef(null)

  const [showRegister, setShowRegister] = useState(false)
  const [exhibitors, setExhibitors] = useState([])
  const [regForm, setRegForm] = useState({
    company_name: '',
    guest_name: '',
    department: '',
    exhibitor_id: ''
  })

  const [devices, setDevices] = useState([])
  const [currentDeviceId, setCurrentDeviceId] = useState(undefined)

  useEffect(() => {
    const init = async () => {
      if (inputRef.current) inputRef.current.focus()

      const { data: exList } = await supabase.from('exhibitors').select('id, company_name').order('company_name')
      if (exList) {
        setExhibitors(exList)
        if (exList.length > 0) setRegForm(prev => ({ ...prev, exhibitor_id: exList[0].id }))
      }

      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput')
        setDevices(videoDevices)
        if (videoDevices.length > 0) setCurrentDeviceId(videoDevices[0].deviceId)
      } catch (err) {
        console.error(err)
      }
    }
    init()

    const keepFocus = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return
      if (!showRegister && inputRef.current) inputRef.current.focus()
    }
    window.addEventListener('click', keepFocus)
    return () => window.removeEventListener('click', keepFocus)
  }, [showRegister])

  // ■ チェックイン処理
  const processCheckIn = async (id) => {
    if (!id) return
    setErrorMsg('')
    setScanResult(null)
    setGuestData(null)
    
    try {
      // 1. ゲスト検索
      const { data: guest, error } = await supabase.from('guests').select('*').eq('id', id).single()

      // ★修正: データがない、またはエラー（無効なQR）の場合はすべて「NOT_FOUND」扱いにする
      if (error || !guest) {
        setScanResult('NOT_FOUND')
        return
      }

      // 2. ステータス判定
      if (guest.status === 'checked_in' || guest.status === 'additional') {
        setScanResult('ALREADY_CHECKED_IN')
        setGuestData(guest)
      } else {
        const { error: updateError } = await supabase.from('guests').update({ status: 'checked_in' }).eq('id', id)
        if (updateError) throw updateError
        setScanResult('SUCCESS')
        setGuestData(guest)
      }
    } catch (err) {
      // 想定外のエラー（DB接続切れなど）以外は、基本NOT_FOUNDに倒す
      // UUID形式違いのエラーなどもここでキャッチされるため、ここでもNOT_FOUNDにするのが安全
      setScanResult('NOT_FOUND')
    } finally {
      setManualInput('')
      setTimeout(() => {
        if (!showRegister && inputRef.current) inputRef.current.focus()
      }, 50)
    }
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    processCheckIn(manualInput)
  }

  const handleCameraScan = (detectedCodes) => {
    if (scanResult) return 
    const rawValue = detectedCodes[0].rawValue
    if (rawValue) processCheckIn(rawValue)
  }

  const handleSwitchCamera = () => {
    if (devices.length <= 1) return
    const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId)
    const nextIndex = (currentIndex + 1) % devices.length
    setCurrentDeviceId(devices[nextIndex].deviceId)
  }

  // ■ 新規登録
  const handleRegister = async (e) => {
    e.preventDefault()
    if (!regForm.guest_name || !regForm.exhibitor_id) return
    try {
      const { data, error } = await supabase.from('guests').insert({
        exhibitor_id: regForm.exhibitor_id,
        company_name: regForm.company_name,
        guest_name: regForm.guest_name,
        department: regForm.department,
        status: 'additional'
      }).select().single()

      if (error) throw error
      
      setShowRegister(false)
      setScanResult('ADDITIONAL_SUCCESS')
      setGuestData(data)
      setRegForm({ ...regForm, company_name: '', guest_name: '', department: '' })
    } catch (err) {
      alert('登録失敗: ' + err.message)
    }
  }

  const handleReset = () => {
    setScanResult(null)
    setGuestData(null)
    setErrorMsg('')
    setManualInput('')
    setShowRegister(false)
    setTimeout(() => { if (inputRef.current) inputRef.current.focus() }, 100)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center">
      <header className="w-full p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 z-10">
        <h1 className="font-bold text-lg">Reception Scanner</h1>
        <Link href="/super-admin" className="text-sm text-blue-300 hover:text-blue-200">Back to Admin</Link>
      </header>

      <div className="flex-1 w-full flex flex-col items-center justify-start p-4 pt-8">
        
        {/* ▼▼▼ 物理リーダー入力欄 ▼▼▼ */}
        {!showRegister && (
          <div className="w-full max-w-md mb-6">
             <div className="flex justify-between items-end mb-1 px-1">
                <p className="text-xs text-blue-300 font-bold">▼ 物理スキャナー入力</p>
                <span className="text-xs bg-blue-600 px-2 py-0.5 rounded text-white font-mono animate-pulse">READY</span>
             </div>
             <form onSubmit={handleManualSubmit}>
               <input
                 ref={inputRef}
                 type="text"
                 value={manualInput}
                 onChange={(e) => setManualInput(e.target.value)}
                 className="w-full bg-white text-black border-4 border-blue-500 rounded px-4 py-4 text-xl font-bold placeholder-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-lg"
                 placeholder="SCAN QR CODE"
                 autoFocus
                 autoComplete="off"
               />
             </form>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-6 w-full max-w-md text-center shadow-lg">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* === 結果表示エリア === */}
        {scanResult ? (
          <div className={`rounded-xl p-8 w-full max-w-md shadow-2xl text-center border-4 ${
            scanResult === 'SUCCESS' ? 'bg-white border-green-500' : 
            scanResult === 'ADDITIONAL_SUCCESS' ? 'bg-blue-50 border-blue-500' : 
            scanResult === 'NOT_FOUND' ? 'bg-gray-100 border-gray-400' : 'bg-red-50 border-red-600'
          }`}>
            
            {/* 1. 通常成功 (緑) */}
            {scanResult === 'SUCCESS' && (
              <>
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">✓</div>
                <h2 className="text-3xl font-bold text-green-600 mb-2">OK</h2>
                <p className="text-gray-500 font-bold mb-6">チェックイン完了</p>
              </>
            )}

            {/* 2. 追加来場成功 (青) */}
            {scanResult === 'ADDITIONAL_SUCCESS' && (
              <>
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">＋</div>
                <h2 className="text-3xl font-bold text-blue-600 mb-2">追加来場</h2>
                <p className="text-blue-800 font-bold mb-6">登録＆入場完了</p>
              </>
            )}

            {/* 3. 重複エラー (赤) */}
            {scanResult === 'ALREADY_CHECKED_IN' && (
              <>
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">!</div>
                <h2 className="text-3xl font-bold text-red-600 mb-2">受付済み</h2>
                <div className="bg-red-600 text-white py-1 px-4 rounded font-bold mb-4">STOP</div>
              </>
            )}

            {/* 4. 該当なし (グレー) */}
            {scanResult === 'NOT_FOUND' && (
              <>
                <div className="w-20 h-20 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">?</div>
                <h2 className="text-2xl font-bold text-gray-700 mb-2">該当なし</h2>
                <p className="text-gray-600 text-sm mb-6">登録データが見つかりません</p>
                <button onClick={() => setShowRegister(true)} className="w-full bg-blue-600 text-white py-3 rounded font-bold shadow hover:bg-blue-700">
                  ＋ 新規来場登録する
                </button>
              </>
            )}

            {/* ゲスト情報表示 (NOT_FOUND以外) */}
            {scanResult !== 'NOT_FOUND' && (
              <div className="text-left border-t border-gray-300 pt-4">
                <p className="text-xs text-gray-400 font-bold">GUEST</p>
                <p className="text-2xl font-bold text-gray-900">{guestData?.guest_name} <span className="text-sm">様</span></p>
                <p className="text-sm text-gray-600">{guestData?.company_name}</p>
                <p className="text-sm text-gray-600">{guestData?.department}</p>
                {guestData?.status === 'additional' && (
                   <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-2 font-bold">追加来場者</span>
                )}
              </div>
            )}

            {/* 共通ボタン: スキャン画面に戻る */}
            {scanResult !== 'NOT_FOUND' && (
                <button onClick={handleReset} className="mt-6 w-full bg-slate-900 text-white py-3 rounded font-bold hover:bg-slate-700">
                  スキャン画面に戻る (Enter)
                </button>
            )}

            {/* ★ここが追加: 受付済み画面でも、同伴者登録へ飛べるようにするボタン */}
            {scanResult === 'ALREADY_CHECKED_IN' && (
                <button 
                  onClick={() => setShowRegister(true)} 
                  className="mt-3 w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700"
                >
                  ＋ 同伴者を新規登録する
                </button>
            )}

          </div>
        ) : (
          /* カメラ待機画面 */
          <div className="w-full max-w-md flex flex-col items-center">
             <div className="w-40 h-40 relative overflow-hidden rounded-lg border-2 border-slate-600 bg-black">
                <Scanner 
                   key={currentDeviceId}
                   onScan={handleCameraScan}
                   constraints={{ deviceId: currentDeviceId ? { exact: currentDeviceId } : undefined }}
                   components={{ audio: false }}
                   styles={{ container: { width: '100%', height: '100%' } }}
                />
             </div>
             {devices.length > 1 && (
               <button onClick={handleSwitchCamera} className="mt-2 text-xs text-gray-400 border border-gray-600 px-2 py-1 rounded">Switch Camera</button>
             )}
          </div>
        )}
      </div>

      {/* === 新規登録モーダル === */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-sm">
          <div className="bg-white text-gray-900 w-full max-w-md rounded-xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-bold">新規来場登録</h2>
              <button onClick={() => setShowRegister(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">会社名</label>
                <input type="text" required className="input-field border-gray-300 bg-gray-50"
                  value={regForm.company_name} onChange={e => setRegForm({...regForm, company_name: e.target.value})} />
              </div>
              <div className="flex gap-4">
                 <div className="flex-1">
                   <label className="block text-xs font-bold text-gray-500 mb-1">氏名 *</label>
                   <input type="text" required className="input-field border-gray-300 bg-gray-50"
                     value={regForm.guest_name} onChange={e => setRegForm({...regForm, guest_name: e.target.value})} />
                 </div>
                 <div className="flex-1">
                   <label className="block text-xs font-bold text-gray-500 mb-1">部署</label>
                   <input type="text" className="input-field border-gray-300 bg-gray-50"
                     value={regForm.department} onChange={e => setRegForm({...regForm, department: e.target.value})} />
                 </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">招待元 (出展者)</label>
                <select className="input-field border-gray-300 bg-gray-50"
                  value={regForm.exhibitor_id} onChange={e => setRegForm({...regForm, exhibitor_id: e.target.value})}>
                  {exhibitors.map(ex => (<option key={ex.id} value={ex.id}>{ex.company_name}</option>))}
                </select>
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setShowRegister(false)} className="flex-1 py-3 rounded bg-gray-200 font-bold text-gray-600">キャンセル</button>
                <button type="submit" className="flex-1 py-3 rounded bg-blue-600 font-bold text-white shadow">登録＆入場</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
'use client'
import { useState, useEffect } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { supabase } from '@/utils/supabaseClient'
import Link from 'next/link'

export default function ScanPage() {
  const [scanResult, setScanResult] = useState(null)
  const [guestData, setGuestData] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  
  // カメラ切り替え用
  const [devices, setDevices] = useState([])
  const [currentDeviceId, setCurrentDeviceId] = useState(undefined)

  // ■ 起動時に利用可能なカメラ一覧を取得
  useEffect(() => {
    const getCameras = async () => {
      try {
        // カメラデバイスを列挙
        const allDevices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput')
        setDevices(videoDevices)
        
        // 最初のカメラをセット（背面があればそれを優先したいが、PCだと名前で判断しづらいため一旦先頭）
        if (videoDevices.length > 0) {
          setCurrentDeviceId(videoDevices[0].deviceId)
        }
      } catch (err) {
        console.error('カメラの取得に失敗:', err)
      }
    }
    getCameras()
  }, [])

  // ■ カメラ切り替えボタンの処理
  const handleSwitchCamera = () => {
    if (devices.length <= 1) return // カメラが1つしかなければ何もしない

    // 現在のカメラがリストの何番目か探す
    const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId)
    // 次のカメラへ（最後なら最初に戻る）
    const nextIndex = (currentIndex + 1) % devices.length
    setCurrentDeviceId(devices[nextIndex].deviceId)
  }

  const handleScan = async (detectedCodes) => {
    if (loading || scanResult) return

    const rawValue = detectedCodes[0].rawValue
    if (!rawValue) return

    setLoading(true)
    setErrorMsg('')
    
    try {
      const { data: guest, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', rawValue)
        .single()

      if (error || !guest) throw new Error('無効なQRコードです。')

      if (guest.status === 'checked_in') {
        setScanResult('ALREADY_CHECKED_IN')
        setGuestData(guest)
        setLoading(false)
        return
      }

      const { error: updateError } = await supabase
        .from('guests')
        .update({ status: 'checked_in' })
        .eq('id', rawValue)

      if (updateError) throw updateError

      setScanResult('SUCCESS')
      setGuestData(guest)

    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setScanResult(null)
    setGuestData(null)
    setErrorMsg('')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center">
      <header className="w-full p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
        <h1 className="font-bold text-lg">受付QRスキャナー</h1>
        <Link href="/admin" className="text-sm text-blue-300 hover:text-blue-200">管理画面へ</Link>
      </header>

      <div className="flex-1 w-full flex flex-col items-center justify-center p-4">
        
        {errorMsg && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-4 w-full max-w-md text-center">
            ⚠️ {errorMsg}
            <button onClick={handleReset} className="block w-full mt-2 text-xs underline">再試行</button>
          </div>
        )}

        {scanResult ? (
          <div className="bg-white text-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl text-center">
            {scanResult === 'SUCCESS' && (
              <>
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
                <h2 className="text-xl font-bold text-green-600 mb-2">受付完了</h2>
              </>
            )}
            {scanResult === 'ALREADY_CHECKED_IN' && (
              <>
                <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">!</div>
                <h2 className="text-xl font-bold text-yellow-600 mb-2">受付済み</h2>
              </>
            )}
            <div className="border-t border-gray-200 pt-4 text-left mt-4">
              <p className="text-xs text-gray-400">氏名</p>
              <p className="text-xl font-bold">{guestData?.guest_name} <span className="text-sm font-normal">様</span></p>
              <p className="text-xs text-gray-400 mt-2">会社名</p>
              <p className="font-bold">{guestData?.company_name}</p>
            </div>
            <button onClick={handleReset} className="mt-6 w-full bg-slate-800 text-white py-3 rounded-lg font-bold">次の人をスキャン</button>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
             
             {/* === 50%縮小カメラエリア === */}
             <div className="w-1/2 aspect-square relative overflow-hidden rounded-xl border-2 border-slate-500 bg-black">
                {/* key={currentDeviceId} をつけることで、IDが変わった時に強制的にカメラを再起動させます
                   constraints={{ deviceId: ... }} で特定のカメラを指定します
                */}
                <Scanner 
                   key={currentDeviceId}
                   onScan={handleScan}
                   constraints={{ 
                     deviceId: currentDeviceId ? { exact: currentDeviceId } : undefined 
                   }}
                   components={{ audio: false }}
                   styles={{ container: { width: '100%', height: '100%' } }}
                />
             </div>

             {/* === カメラ切り替えボタン (2台以上ある場合のみ表示) === */}
             {devices.length > 1 && (
               <button 
                 onClick={handleSwitchCamera}
                 className="mt-6 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg transition"
               >
                 <span className="text-xl">📷</span> 
                 カメラ切替 ({devices.length}台検出)
               </button>
             )}
             
             <p className="mt-4 text-xs text-gray-400">
               現在使用中: {devices.find(d => d.deviceId === currentDeviceId)?.label || 'カメラ'}
             </p>
          </div>
        )}
      </div>
    </div>
  )
}
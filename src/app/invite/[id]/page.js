'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useParams } from 'next/navigation'
import QRCode from 'react-qr-code'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function InvitePage() {
  const params = useParams()
  const { id } = params // URLから招待IDを取得
  const [guest, setGuest] = useState(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef() // PDFにする範囲を指定するタグ

  // ■ データ取得
  useEffect(() => {
    const fetchInviteData = async () => {
      // ゲスト情報と、紐付いている出展者情報をまとめて取得
      const { data, error } = await supabase
        .from('guests')
        .select(`
          *,
          exhibitors (
            company_name,
            booth_number
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error(error)
      } else {
        setGuest(data)
      }
      setLoading(false)
    }

    if (id) fetchInviteData()
  }, [id])

  // ■ PDFダウンロード処理
  const handleDownloadPdf = async () => {
    if (!printRef.current) return

    try {
      // 1. HTMLを画像(Canvas)に変換
      const canvas = await html2canvas(printRef.current, {
        scale: 2, // 高解像度でキャプチャ
        useCORS: true,
      })
      const imgData = canvas.toDataURL('image/png')

      // 2. PDFを作成 (A4縦)
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      // 画像のアスペクト比に合わせて高さを計算
      const imgProps = pdf.getImageProperties(imgData)
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width
      
      // PDFに画像を貼り付け
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight)
      pdf.save(`招待状_${guest.guest_name}様.pdf`)

    } catch (err) {
      alert('PDF生成に失敗しました: ' + err.message)
    }
  }

  if (loading) return <div className="p-10 text-center">読み込み中...</div>
  if (!guest) return <div className="p-10 text-center text-red-500">招待状が見つかりません</div>

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
      
      {/* 操作ボタンエリア */}
      <div className="w-full max-w-[400px] mb-6 flex justify-between items-center">
        <p className="text-sm text-gray-500">招待状プレビュー</p>
        <button 
          onClick={handleDownloadPdf}
          className="bg-blue-600 text-white px-6 py-2 rounded-full shadow hover:bg-blue-700 font-bold text-sm flex items-center gap-2"
        >
          <span>📥</span> PDF保存
        </button>
      </div>

      {/* === 招待状デザイン (ここがPDFになります) === */}
      <div className="shadow-2xl">
        <div 
          ref={printRef} 
          className="w-[375px] bg-white text-gray-800 relative overflow-hidden flex flex-col"
          style={{ minHeight: '600px' }} // 縦長比率を維持
        >
            {/* ヘッダー装飾 */}
            <div className="bg-slate-900 h-24 flex items-center justify-center">
                <h1 className="text-white text-xl font-bold tracking-widest">DX EXPO 2025</h1>
            </div>

            <div className="p-8 flex-1 flex flex-col items-center">
                
                {/* 宛名エリア */}
                <div className="w-full mb-8 text-left">
                    <p className="text-sm text-gray-500 mb-1">{guest.company_name}</p>
                    {/* items-baselineに変更し、文字の基準線で揃えます */}
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <h2 className="text-3xl font-bold text-black leading-none">
                               {guest.guest_name}
                            </h2>
                            <span className="text-lg text-gray-600">様</span>
                        </div>
                </div>

                {/* QRコードエリア */}
                <div className="bg-white border-4 border-double border-gray-200 p-6 rounded-xl mb-8 flex flex-col items-center shadow-sm w-full">
                    <p className="text-xs font-bold text-blue-600 mb-3 uppercase tracking-wider">Reception QR Code</p>
                    <div className="bg-white p-2">
                         {/* QRの中身は招待ID */}
                        <QRCode value={guest.id} size={160} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3 text-center">
                        受付にてこのコードをご提示ください
                    </p>
                </div>

                <hr className="w-full border-gray-200 mb-8" />

                {/* 出展者情報 */}
                <div className="w-full text-left">
                    <p className="text-[10px] text-gray-400 uppercase mb-1">Invited by</p>
                    <div className="flex items-start gap-3">
                        <div>
                            <p className="font-bold text-gray-800 text-lg">
                                {guest.exhibitors?.company_name || '出展社名未設定'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                小間番号: <span className="font-mono bg-yellow-100 px-2 rounded font-bold">{guest.exhibitors?.booth_number || '未定'}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* フッター装飾 */}
                <div className="mt-auto pt-8 w-full text-center">
                     <p className="text-[10px] text-gray-300">© 2025 DX EXPO Executive Committee</p>
                </div>
            </div>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-gray-400 text-center max-w-md">
        ※当日スマホで表示する場合は、このページのURLをブックマークするか、スクリーンショットを保存してください。
      </p>

    </div>
  )
}
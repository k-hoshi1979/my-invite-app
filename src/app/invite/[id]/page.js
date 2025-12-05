'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useParams } from 'next/navigation'
import QRCode from 'react-qr-code'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function InvitePage() {
  const params = useParams()
  const { id } = params
  const [guest, setGuest] = useState(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef()

  useEffect(() => {
    const fetchInviteData = async () => {
      const { data } = await supabase.from('guests').select(`*, exhibitors (company_name, booth_number)`).eq('id', id).single()
      if (data) setGuest(data)
      setLoading(false)
    }
    if (id) fetchInviteData()
  }, [id])

  // ■ 修正版 PDFダウンロード処理
  const handleDownloadPdf = async () => {
    if (!printRef.current) return
    try {
      // 1. HTMLを画像化
      const canvas = await html2canvas(printRef.current, { 
        scale: 3, // 解像度を上げて文字をきれいに
        useCORS: true 
      })
      const imgData = canvas.toDataURL('image/png')
      
      // 2. A4サイズのPDFを作成 (210mm x 297mm)
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = 210
      const pdfHeight = 297
      
      // 3. 画像の比率を計算
      const imgProps = pdf.getImageProperties(imgData)
      const contentHeight = (imgProps.height * pdfWidth) / imgProps.width
      
      // ★ここが修正ポイント: はみ出し防止ロジック
      // コンテンツの高さがA4(297mm)より大きい場合、あるいはギリギリすぎる場合
      // 少し縮小して収める
      if (contentHeight > pdfHeight) {
        // 高さに合わせて幅を縮小
        const scaledWidth = (pdfWidth * pdfHeight) / contentHeight
        // 中央寄せで配置
        const x = (pdfWidth - scaledWidth) / 2
        pdf.addImage(imgData, 'PNG', x, 0, scaledWidth, pdfHeight)
      } else {
        // 通常通り配置（高さに余裕がある場合）
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, contentHeight)
      }

      pdf.save(`招待状_${guest.guest_name}.pdf`)
    } catch (err) {
      alert('PDF生成失敗: ' + err.message)
    }
  }

  if (loading) return <div style={{color:'white', padding:'20px'}}>Loading...</div>
  if (!guest) return <div style={{color:'white', padding:'20px'}}>Invalid ID</div>

  return (
    <div className="invite-screen">
      <div className="invite-controls">
        <button onClick={handleDownloadPdf} className="btn btn-secondary">PDF Download</button>
      </div>

      {/* 印刷対象エリア */}
      <div className="invite-paper" ref={printRef}>
        
        <div className="paper-header">
          <div className="paper-title">19回としまMONOづくりメッセ</div>
          <div className="paper-subtitle">OFFICIAL INVITATION 2025</div>
        </div>

        <div className="paper-body">
          <div className="paper-greeting">
            拝啓<br/>
            時下ますますご清栄のこととお慶び申し上げます。<br/>
            この度、弊社展示ブースへのご招待をお送りいたします。
          </div>

          <div className="guest-info">
            <div className="guest-company">{guest.company_name}</div>
            <div className="guest-name-wrap">
              <span className="guest-name">{guest.guest_name}</span>
              <span style={{fontSize:'14px'}}>様</span>
            </div>
          </div>

          <div className="qr-section">
            <div className="qr-frame">
              <QRCode value={guest.id} size={120} />
            </div>
            <div className="qr-caption">SCAN AT RECEPTION</div>
          </div>

          <div className="exhibitor-info">
            <div className="exhibitor-label">Invited by</div>
            <div className="exhibitor-name">{guest.exhibitors?.company_name || '出展社'}</div>
            <span className="booth-number">BOOTH: {guest.exhibitors?.booth_number || '-'}</span>
          </div>
        </div>

        <div className="paper-footer">
          サンシャインシティ文化会館 / HALL B
        </div>
      </div>
    </div>
  )
}
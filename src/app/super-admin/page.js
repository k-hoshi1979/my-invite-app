'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'

export default function SuperAdminPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [exhibitors, setExhibitors] = useState([])
  const [allGuests, setAllGuests] = useState([])
  const [stats, setStats] = useState({ totalGuests: 0, checkedIn: 0 })
  const [loading, setLoading] = useState(true)

  const [selectedExhibitor, setSelectedExhibitor] = useState(null)
  const [modalGuests, setModalGuests] = useState([])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      await fetchAllData()
    }
    init()
  }, [router])

  const fetchAllData = async () => {
    try {
      const { data: exhibitorList, error: exError } = await supabase
        .from('exhibitors').select('*').order('company_name', { ascending: true })
      if (exError) throw exError

      const { data: guestList, error: guestError } = await supabase
        .from('guests').select('*')
      if (guestError) throw guestError

      setAllGuests(guestList)

      // 集計: 「checked_in」または「additional」なら来場済みとみなす
      const total = guestList.length
      const checked = guestList.filter(g => g.status === 'checked_in' || g.status === 'additional').length
      setStats({ totalGuests: total, checkedIn: checked })

      const mergedList = exhibitorList.map(ex => {
        const myGuests = guestList.filter(g => g.exhibitor_id === ex.id)
        return {
          ...ex,
          guestCount: myGuests.length,
          checkedInCount: myGuests.filter(g => g.status === 'checked_in' || g.status === 'additional').length
        }
      })
      setExhibitors(mergedList)

    } catch (err) {
      alert('データ取得エラー: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadCsv = (data, filename) => {
    if (!data || data.length === 0) { alert('データがありません'); return }
    const csvData = data.map(g => ({
      ID: g.id,
      Guest_Company: g.company_name,
      Department: g.department,
      Guest_Name: g.guest_name,
      Email: g.email,
      Status: g.status,
      Exhibitor_ID: g.exhibitor_id,
      Registered_At: g.created_at
    }))
    const csv = Papa.unparse(csvData)
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadAll = () => {
    const enrichedData = allGuests.map(guest => {
      const exhibitor = exhibitors.find(e => e.id === guest.exhibitor_id)
      return { ...guest, Exhibitor_Name: exhibitor ? exhibitor.company_name : 'Unknown' }
    })
    downloadCsv(enrichedData, `All_Guests_${new Date().toISOString().slice(0,10)}.csv`)
  }

  const openDetailModal = (exhibitor) => {
    const guests = allGuests.filter(g => g.exhibitor_id === exhibitor.id)
    setSelectedExhibitor(exhibitor)
    setModalGuests(guests)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return <div style={{padding:'20px'}}>Loading Super Admin...</div>

  return (
    <div className="admin-layout">
      <aside className="sidebar" style={{backgroundColor:'#000'}}>
        <div className="sidebar-header" style={{color:'#fff', borderColor:'#333'}}>SUPER ADMIN</div>
        <nav className="sidebar-nav">
          <div className="nav-item active" style={{borderLeftColor:'red'}}>All Exhibitors</div>
          <button onClick={() => router.push('/scan')} className="nav-item" style={{background:'none', border:'none', width:'100%', textAlign:'left', cursor:'pointer', marginTop: '10px', color: '#ccc'}}>
            📷 Open Scanner
          </button>
        </nav>
        <div className="sidebar-footer" style={{borderColor:'#333'}}>
          <p style={{color:'#999'}}>{user?.email}</p>
          <button onClick={handleLogout} className="btn btn-danger" style={{padding:0, marginTop:'10px'}}>Log out</button>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <h2>Organizer Dashboard</h2>
          <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
            <div style={{fontSize:'12px', color:'#666', marginRight:'10px'}}>
              Total Guests: <strong>{stats.totalGuests}</strong> / Checked-in: <strong>{stats.checkedIn}</strong>
            </div>
            <button onClick={handleDownloadAll} className="btn btn-primary" style={{backgroundColor:'#10b981'}}>
              📥 Download All CSV
            </button>
          </div>
        </div>

        <div className="content-area">
          <div className="guest-table-wrapper">
            <table className="guest-table">
              <thead>
                <tr>
                  <th>COMPANY NAME</th>
                  <th>BOOTH</th>
                  <th>GUESTS</th>
                  <th>CHECK-IN</th>
                  <th>RATE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {exhibitors.map((ex) => {
                  const rate = ex.guestCount > 0 ? Math.round((ex.checkedInCount / ex.guestCount) * 100) : 0
                  return (
                    <tr key={ex.id}>
                      <td style={{fontWeight:'bold'}}>{ex.company_name}</td>
                      <td>{ex.booth_number || '-'}</td>
                      <td>{ex.guestCount}名</td>
                      <td>{ex.checkedInCount}名</td>
                      <td>
                        <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                          <div style={{width:'50px', height:'4px', background:'#eee', borderRadius:'2px', overflow:'hidden'}}>
                            <div style={{width:`${rate}%`, height:'100%', background: rate > 0 ? '#2563eb' : 'transparent'}}></div>
                          </div>
                          <span style={{fontSize:'10px'}}>{rate}%</span>
                        </div>
                      </td>
                      <td>
                        <button onClick={() => openDetailModal(ex)} className="btn btn-secondary" style={{padding:'4px 10px', fontSize:'11px'}}>VIEW LIST</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {selectedExhibitor && (
        <div className="overlay">
          <div className="modal" style={{maxWidth:'800px', width:'90%', height:'80vh', display:'flex', flexDirection:'column'}}>
            <div className="modal-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div>
                Guest List: {selectedExhibitor.company_name}
                <span style={{fontSize:'12px', color:'#666', marginLeft:'10px'}}>({modalGuests.length} guests)</span>
              </div>
              <button onClick={() => downloadCsv(modalGuests, `Guests_${selectedExhibitor.company_name}.csv`)} className="btn btn-secondary" style={{fontSize:'11px', padding:'4px 8px'}}>
                📥 This List CSV
              </button>
            </div>
            <div style={{flex:1, overflowY:'auto', border:'1px solid #eee', borderRadius:'4px'}}>
              <table className="guest-table">
                <thead style={{position:'sticky', top:0, zIndex:1}}>
                  <tr>
                    <th>COMPANY</th>
                    <th>DEPT</th>
                    <th>NAME</th>
                    <th>EMAIL</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {modalGuests.length === 0 ? (
                    <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>No guests found.</td></tr>
                  ) : (
                    modalGuests.map(g => (
                      <tr key={g.id}>
                        <td>{g.company_name}</td>
                        <td style={{fontSize:'12px', color:'#666'}}>{g.department}</td>
                        <td style={{fontWeight:'bold'}}>{g.guest_name}</td>
                        <td style={{fontSize:'11px', color:'#666'}}>{g.email}</td>
                        <td>
                          {/* ▼▼▼ ステータス表示の分岐 ▼▼▼ */}
                          <span className={`status-badge ${
                            g.status === 'checked_in' ? 'status-checked' : 
                            g.status === 'additional' ? 'status-additional' : 'status-invited'
                          }`}>
                            {g.status === 'checked_in' ? 'CHECKED' : 
                             g.status === 'additional' ? 'ADDITIONAL' : 'INVITED'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="modal-actions" style={{marginTop:'15px'}}>
              <button onClick={() => setSelectedExhibitor(null)} className="btn btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
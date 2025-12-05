'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [exhibitorInfo, setExhibitorInfo] = useState({ company_name: '', booth_number: '' })
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [newGuestName, setNewGuestName] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newDepartment, setNewDepartment] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [editingGuest, setEditingGuest] = useState(null)
  const [editForm, setEditForm] = useState({ guest_name: '', company_name: '', department: '', email: '' })

  const [showSettings, setShowSettings] = useState(false)
  const [showCsv, setShowCsv] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      
      const { data: exhibitor } = await supabase.from('exhibitors').select('*').eq('id', session.user.id).single()
      if (!exhibitor) {
        const newProfile = { id: session.user.id, company_name: '未設定', email: session.user.email }
        await supabase.from('exhibitors').insert(newProfile)
        setExhibitorInfo(newProfile)
      } else {
        setExhibitorInfo(exhibitor)
      }
      fetchGuests(session.user.id)
    }
    init()
  }, [router])

  const fetchGuests = async (userId) => {
    const { data } = await supabase.from('guests').select('*').eq('exhibitor_id', userId).order('created_at', { ascending: false })
    if (data) setGuests(data)
    setLoading(false)
  }

  const handleAddGuest = async (e) => {
    e.preventDefault()
    if (!newGuestName) return
    setIsSubmitting(true)
    const { error } = await supabase.from('guests').insert({
      exhibitor_id: user.id,
      guest_name: newGuestName,
      company_name: newCompanyName,
      department: newDepartment,
      email: newEmail,
      status: 'invited'
    })
    if (!error) {
      setNewGuestName(''); setNewCompanyName(''); setNewDepartment(''); setNewEmail('')
      fetchGuests(user.id)
    } else {
      alert(error.message)
    }
    setIsSubmitting(false)
  }

  const handleDeleteGuest = async (guestId) => {
    if (!window.confirm('本当にこの招待客データを削除しますか？\n※この操作は取り消せません。')) return
    const { error } = await supabase.from('guests').delete().eq('id', guestId)
    if (!error) fetchGuests(user.id)
    else alert('削除失敗: ' + error.message)
  }

  const openEditModal = (guest) => {
    setEditingGuest(guest)
    setEditForm({
      guest_name: guest.guest_name,
      company_name: guest.company_name || '',
      department: guest.department || '',
      email: guest.email || ''
    })
  }

  const handleUpdateGuest = async (e) => {
    e.preventDefault()
    if (!editingGuest) return
    const { error } = await supabase.from('guests').update({
      guest_name: editForm.guest_name,
      company_name: editForm.company_name,
      department: editForm.department,
      email: editForm.email
    }).eq('id', editingGuest.id)

    if (!error) {
      setEditingGuest(null)
      fetchGuests(user.id)
    } else {
      alert('更新失敗: ' + error.message)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('exhibitors').update({
      company_name: exhibitorInfo.company_name,
      booth_number: exhibitorInfo.booth_number
    }).eq('id', user.id)
    if (!error) { alert('情報を更新しました'); setShowSettings(false) }
    else alert('更新失敗: ' + error.message)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data
        if (!rows[0] || !rows[0].name) {
          alert('CSV形式エラー: name列は必須です')
          return
        }
        const insertData = rows.map(row => ({
          exhibitor_id: user.id,
          guest_name: row.name,
          company_name: row.company || '',
          department: row.department || '',
          email: row.email || '',
          status: 'invited'
        }))
        const { error } = await supabase.from('guests').insert(insertData)
        if (!error) {
          alert(`${insertData.length}件インポート完了`)
          setShowCsv(false)
          fetchGuests(user.id)
        } else {
          alert('インポート失敗: ' + error.message)
        }
      }
    })
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return <div style={{padding:'20px'}}>Loading...</div>

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">Admin Panel</div>
        <nav className="sidebar-nav">
          <div className="nav-item active">Guest List</div>
          <button onClick={() => setShowSettings(true)} className="nav-item" style={{background:'none', border:'none', width:'100%', textAlign:'left', cursor:'pointer'}}>
            Settings
          </button>
        </nav>
        <div className="sidebar-footer">
          <p>{exhibitorInfo.company_name}</p>
          <button onClick={handleLogout} className="btn btn-danger" style={{padding:0, marginTop:'10px'}}>Log out</button>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <h2>Guest Management</h2>
          <div style={{display:'flex', gap:'10px'}}>
             <button onClick={() => setShowCsv(true)} className="btn btn-secondary">📂 CSV Import</button>
          </div>
        </div>

        <div className="content-area">
          <form onSubmit={handleAddGuest} className="create-guest-form">
            <div style={{flex:1}}>
              <label className="form-label">COMPANY</label>
              <input type="text" className="input-field" placeholder="会社名" value={newCompanyName} onChange={(e)=>setNewCompanyName(e.target.value)} />
            </div>
            <div style={{flex:1}}>
              <label className="form-label">DEPT</label>
              <input type="text" className="input-field" placeholder="部署・役職" value={newDepartment} onChange={(e)=>setNewDepartment(e.target.value)} />
            </div>
            <div style={{flex:1}}>
              <label className="form-label">NAME *</label>
              <input type="text" className="input-field" placeholder="氏名" required value={newGuestName} onChange={(e)=>setNewGuestName(e.target.value)} />
            </div>
            <div style={{flex:1}}>
              <label className="form-label">EMAIL</label>
              <input type="email" className="input-field" placeholder="Email" value={newEmail} onChange={(e)=>setNewEmail(e.target.value)} />
            </div>
            <button disabled={isSubmitting} className="btn btn-primary">ADD</button>
          </form>

          <div className="guest-table-wrapper">
            <table className="guest-table">
              <thead>
                <tr>
                  <th>COMPANY</th>
                  <th>DEPT</th>
                  <th>NAME</th>
                  <th>EMAIL</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((guest) => (
                  <tr key={guest.id}>
                    <td>{guest.company_name}</td>
                    <td style={{color:'#666', fontSize:'13px'}}>{guest.department || '-'}</td>
                    <td style={{fontWeight:'bold'}}>{guest.guest_name} 様</td>
                    <td style={{color:'#666', fontSize:'12px'}}>{guest.email || '-'}</td>
                    <td>
                      {/* ▼▼▼ ステータス表示の分岐 ▼▼▼ */}
                      <span className={`status-badge ${
                        guest.status === 'checked_in' ? 'status-checked' : 
                        guest.status === 'additional' ? 'status-additional' : 'status-invited'
                      }`}>
                        {guest.status === 'checked_in' ? 'CHECKED-IN' : 
                         guest.status === 'additional' ? 'ADDITIONAL' : 'INVITED'}
                      </span>
                    </td>
                    <td>
                      <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                        <a href={`/invite/${guest.id}`} target="_blank" style={{color:'#2563eb', fontSize:'12px', textDecoration:'none'}}>Card</a>
                        <button onClick={() => openEditModal(guest)} className="btn btn-secondary" style={{padding:'2px 6px', fontSize:'10px'}}>Edit</button>
                        <button onClick={() => handleDeleteGuest(guest.id)} className="btn btn-danger" style={{padding:'2px 6px', fontSize:'10px', border:'1px solid #fee2e2'}}>Del</button>
                        {guest.email && (
                          <a href={`mailto:${guest.email}?subject=Invitation&body=${window.location.origin}/invite/${guest.id}`} 
                             className="btn btn-secondary" style={{padding:'2px 6px', fontSize:'10px'}}>✉</a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showSettings && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-header">Exhibitor Settings</div>
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input 
                  type="text" className="input-field" required
                  value={exhibitorInfo.company_name}
                  onChange={(e) => setExhibitorInfo({...exhibitorInfo, company_name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Booth Number</label>
                <input 
                  type="text" className="input-field" placeholder="A-12"
                  value={exhibitorInfo.booth_number || ''}
                  onChange={(e) => setExhibitorInfo({...exhibitorInfo, booth_number: e.target.value})}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowSettings(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingGuest && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-header">Edit Guest Info</div>
            <form onSubmit={handleUpdateGuest}>
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input type="text" className="input-field" value={editForm.company_name} onChange={(e) => setEditForm({...editForm, company_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input type="text" className="input-field" value={editForm.department} onChange={(e) => setEditForm({...editForm, department: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Guest Name</label>
                <input type="text" className="input-field" required value={editForm.guest_name} onChange={(e) => setEditForm({...editForm, guest_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="input-field" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingGuest(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCsv && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-header">Import CSV</div>
            <div className="file-input-wrapper">
              <label className="file-input-label">Select CSV File</label>
              <input type="file" accept=".csv" onChange={handleFileUpload} />
              <p className="csv-note">※ Header required: name, company, department, email</p>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowCsv(false)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
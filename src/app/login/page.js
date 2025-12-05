'use client'
import { useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErrorMsg('ログインに失敗しました')
      setLoading(false)
    } else {
      router.push('/admin')
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">LOGIN</h1>
        
        {errorMsg && <p style={{color: 'red', fontSize: '12px'}}>{errorMsg}</p>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">EMAIL</label>
            <input 
              type="email" 
              className="input-field" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">PASSWORD</label>
            <input 
              type="password" 
              className="input-field" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{width: '100%'}}>
            {loading ? '...' : 'ENTER'}
          </button>
        </form>
      </div>
    </div>
  )
}
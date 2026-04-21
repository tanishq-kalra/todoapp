import React,{useState} from "react"
import {useAuth, api} from "../contexts/AuthContext"
import {useNavigate} from "react-router-dom"
import {CheckSquare} from "lucide-react"

const Login=()=>{

const {login, setUser}=useAuth()
const navigate=useNavigate()

const [email,setEmail]=useState("")
const [password,setPassword]=useState("")
const [error, setError] = useState("")

const [isOtpMode, setIsOtpMode] = useState(false)
const [otp, setOtp] = useState("")
const [otpSent, setOtpSent] = useState(false)
const [loading, setLoading] = useState(false)

const submit=async(e)=>{
  e.preventDefault()
  setError("")
  setLoading(true)
  try {
    await login(email,password)
    navigate("/dashboard")
  } catch (err) {
    setError(err.message || "Invalid credentials")
  } finally {
    setLoading(false)
  }
}

const handleSendOtp = async (e) => {
  e.preventDefault()
  setError("")
  if (!email) {
    setError("Please enter your email")
    return
  }
  setLoading(true)
  try {
    await api.post("/api/auth/send-otp", { email })
    setOtpSent(true)
  } catch (err) {
    setError(err?.response?.data?.detail || err.message || "Failed to send OTP")
  } finally {
    setLoading(false)
  }
}

const handleVerifyOtp = async (e) => {
  e.preventDefault()
  setError("")
  if (!otp) {
    setError("Please enter the OTP")
    return
  }
  setLoading(true)
  try {
    const res = await api.post("/api/auth/verify-otp", { email, otp })
    if (res.data.token) {
      localStorage.setItem("token", res.data.token)
    }
    if (res.data.user) {
      setUser(res.data.user)
    }
    navigate("/dashboard")
  } catch (err) {
    setError(err?.response?.data?.detail || err.message || "Invalid or expired OTP")
  } finally {
    setLoading(false)
  }
}

return(

<div style={{minHeight:"100vh",background:"linear-gradient(to bottom right, #f8fafc, #f1f5f9)",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
  <div style={{width:"100%",maxWidth:"28rem",backgroundColor:"white",borderRadius:"0.5rem",boxShadow:"0 20px 25px -5px rgba(0, 0, 0, 0.1)",padding:"2rem"}}>
    <div style={{display:"flex",justifyContent:"center",marginBottom:"1.5rem"}}>
      <div style={{width:"4rem",height:"4rem",borderRadius:"0.75rem",backgroundColor:"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <CheckSquare style={{width:"2rem",height:"2rem",color:"#16a34a"}} />
      </div>
    </div>
    <h1 style={{fontSize:"1.875rem",fontWeight:"bold",textAlign:"center",marginBottom:"0.5rem",color:"#0f172a"}}>Welcome Back</h1>
    <p style={{textAlign:"center",color:"#4b5563",marginBottom:"2rem"}}>
      {isOtpMode ? "Sign in using verification code" : "Sign in to your account to continue"}
    </p>
    
    {error && (
      <div style={{marginBottom:"1.5rem",padding:"1rem",backgroundColor:"#fef2f2",border:"1px solid #fecaca",borderRadius:"0.375rem",color:"#dc2626",fontSize:"0.875rem"}}>
        {error}
      </div>
    )}

    {!isOtpMode ? (
      <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
        <div>
          <label style={{display:"block",fontSize:"0.875rem",fontWeight:"500",color:"#374151",marginBottom:"0.5rem"}}>EMAIL</label>
          <input 
            type="email"
            value={email} 
            onChange={e=>setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={{width:"100%",padding:"0.75rem 1rem",border:"1px solid #cbd5e1",backgroundColor:"white",color:"#0f172a",borderRadius:"0.5rem",fontSize:"1rem",boxSizing:"border-box"}}
          />
        </div>

        <div>
          <label style={{display:"block",fontSize:"0.875rem",fontWeight:"500",color:"#374151",marginBottom:"0.5rem"}}>PASSWORD</label>
          <input 
            type="password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={{width:"100%",padding:"0.75rem 1rem",border:"1px solid #cbd5e1",backgroundColor:"white",color:"#0f172a",borderRadius:"0.5rem",fontSize:"1rem",boxSizing:"border-box"}}
          />
        </div>

        <button 
          type="submit"
          disabled={loading}
          style={{width:"100%",backgroundColor:"#16a34a",color:"white",fontWeight:"500",padding:"0.75rem 1rem",borderRadius:"0.5rem",border:"none",cursor:loading ? "not-allowed" : "pointer",fontSize:"1rem",transition:"background-color 0.2s", opacity: loading ? 0.7 : 1}}
          onMouseEnter={e=>{if(!loading) e.target.style.backgroundColor="#15803d"}}
          onMouseLeave={e=>{if(!loading) e.target.style.backgroundColor="#16a34a"}}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    ) : (
      <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
        {!otpSent ? (
          <form onSubmit={handleSendOtp} style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
            <div>
              <label style={{display:"block",fontSize:"0.875rem",fontWeight:"500",color:"#374151",marginBottom:"0.5rem"}}>EMAIL</label>
              <input 
                type="email"
                value={email} 
                onChange={e=>setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{width:"100%",padding:"0.75rem 1rem",border:"1px solid #cbd5e1",backgroundColor:"white",color:"#0f172a",borderRadius:"0.5rem",fontSize:"1rem",boxSizing:"border-box"}}
              />
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              style={{width:"100%",backgroundColor:"#16a34a",color:"white",fontWeight:"500",padding:"0.75rem 1rem",borderRadius:"0.5rem",border:"none",cursor:loading ? "not-allowed" : "pointer",fontSize:"1rem",transition:"background-color 0.2s", opacity: loading ? 0.7 : 1}}
              onMouseEnter={e=>{if(!loading) e.target.style.backgroundColor="#15803d"}}
              onMouseLeave={e=>{if(!loading) e.target.style.backgroundColor="#16a34a"}}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
            <div>
              <label style={{display:"block",fontSize:"0.875rem",fontWeight:"500",color:"#374151",marginBottom:"0.5rem"}}>VERIFICATION CODE</label>
              <input 
                type="text"
                value={otp} 
                onChange={e=>setOtp(e.target.value)}
                placeholder="Enter 6-digit code"
                required
                style={{width:"100%",padding:"0.75rem 1rem",border:"1px solid #cbd5e1",backgroundColor:"white",color:"#0f172a",borderRadius:"0.5rem",fontSize:"1rem",boxSizing:"border-box",letterSpacing:"0.1em"}}
              />
              <p style={{fontSize:"0.75rem",color:"#64748b",marginTop:"0.5rem"}}>
                Code sent to {email}. <button type="button" onClick={() => setOtpSent(false)} style={{background:"none",border:"none",color:"#16a34a",cursor:"pointer",padding:0,textDecoration:"underline"}}>Change email</button>
              </p>
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              style={{width:"100%",backgroundColor:"#16a34a",color:"white",fontWeight:"500",padding:"0.75rem 1rem",borderRadius:"0.5rem",border:"none",cursor:loading ? "not-allowed" : "pointer",fontSize:"1rem",transition:"background-color 0.2s", opacity: loading ? 0.7 : 1}}
              onMouseEnter={e=>{if(!loading) e.target.style.backgroundColor="#15803d"}}
              onMouseLeave={e=>{if(!loading) e.target.style.backgroundColor="#16a34a"}}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        )}
      </div>
    )}

    <div style={{marginTop:"1.5rem",display:"flex",justifyContent:"center"}}>
      <button
        type="button"
        onClick={() => {
          setIsOtpMode(!isOtpMode)
          setError("")
          setOtpSent(false)
          setOtp("")
        }}
        style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:"0.875rem",fontWeight:"500",textDecoration:"underline"}}
      >
        {isOtpMode ? "Login with Password instead" : "Login with OTP instead"}
      </button>
    </div>

    <p style={{marginTop:"1.5rem",textAlign:"center",color:"#4b5563",fontSize:"0.875rem"}}>
      Don't have an account? <a href="/register" style={{color:"#16a34a",fontWeight:"500",textDecoration:"none"}}>Sign up</a>
    </p>
  </div>
</div>

)

}

export default Login
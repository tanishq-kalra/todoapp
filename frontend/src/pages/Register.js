import React,{useState} from "react"
import {useAuth} from "../contexts/AuthContext"
import {useNavigate} from "react-router-dom"
import {CheckSquare} from "lucide-react"
import { GoogleLogin } from '@react-oauth/google';

const Register=()=>{

const {register, googleLogin}=useAuth()

const navigate=useNavigate()

const [name,setName]=useState("")
const [email,setEmail]=useState("")
const [password,setPassword]=useState("")
const [error, setError] = useState("")

const submit=async(e)=>{

e.preventDefault()
setError("")

try {
  await register(name,email,password)
  navigate("/dashboard")
} catch (err) {
  setError(err.message || "Failed to create account")
}

}

const handleGoogleSuccess = async (credentialResponse) => {
  try {
    await googleLogin(credentialResponse.credential)
    navigate("/dashboard")
  } catch (err) {
    setError("Google sign-up failed")
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
    <h1 style={{fontSize:"1.875rem",fontWeight:"bold",textAlign:"center",marginBottom:"0.5rem",color:"#0f172a"}}>Create account</h1>
    <p style={{textAlign:"center",color:"#4b5563",marginBottom:"2rem"}}>Start organizing your tasks today</p>
    
    {error && (
      <div style={{marginBottom:"1.5rem",padding:"1rem",backgroundColor:"#fef2f2",border:"1px solid #fecaca",borderRadius:"0.375rem",color:"#dc2626",fontSize:"0.875rem"}}>
        {error}
      </div>
    )}

    <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
      <div>
        <label style={{display:"block",fontSize:"0.875rem",fontWeight:"500",color:"#374151",marginBottom:"0.5rem"}}>NAME</label>
        <input 
          value={name} 
          onChange={e=>setName(e.target.value)}
          placeholder="John Doe"
          required
          style={{width:"100%",padding:"0.75rem 1rem",border:"1px solid #cbd5e1",backgroundColor:"white",color:"#0f172a",borderRadius:"0.5rem",fontSize:"1rem",boxSizing:"border-box"}}
        />
      </div>

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
        style={{width:"100%",backgroundColor:"#16a34a",color:"white",fontWeight:"500",padding:"0.75rem 1rem",borderRadius:"0.5rem",border:"none",cursor:"pointer",fontSize:"1rem",transition:"background-color 0.2s"}}
        onMouseEnter={e=>e.target.style.backgroundColor="#15803d"}
        onMouseLeave={e=>e.target.style.backgroundColor="#16a34a"}
      >
        Create account
      </button>
    </form>

    <div style={{marginTop:"1.5rem",marginBottom:"1.5rem",display:"flex",alignItems:"center"}}>
      <div style={{flex:1,height:"1px",backgroundColor:"#e2e8f0"}}></div>
      <span style={{padding:"0 0.5rem",color:"#94a3b8",fontSize:"0.875rem",fontWeight:"500"}}>OR</span>
      <div style={{flex:1,height:"1px",backgroundColor:"#e2e8f0"}}></div>
    </div>

    <div style={{display:"flex",justifyContent:"center"}}>
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => setError("Google sign-up failed")}
        theme="outline"
        size="large"
      />
    </div>

    <p style={{marginTop:"1.5rem",textAlign:"center",color:"#4b5563",fontSize:"0.875rem"}}>
      Already have an account? <a href="/login" style={{color:"#16a34a",fontWeight:"500",textDecoration:"none"}}>Sign in</a>
    </p>
  </div>
</div>

)

}

export default Register
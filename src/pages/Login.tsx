import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'

type Page = 'login' | 'signup'
const ROLES = ['Admin','Deputy','Manager','Viewer'] as const

export default function Login() {
  const { login, signup } = useAuthStore()
  const [page, setPage] = useState<Page>('login')

  // Login state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  // Signup state
  const [form, setForm] = useState({ username:'', name:'', role:'Viewer' as typeof ROLES[number], password:'', confirm:'' })
  const [signupError, setSignupError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [showSpw, setShowSpw] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    const ok = await login(username.trim(), password)
    if (ok === 'network') setLoginError('تعذر الاتصال بالسيرفر — يرجى تشغيل البرنامج من الايقونة على سطح المكتب')
    else if (!ok) setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة')
    setLoginLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignupError('')
    if (form.password !== form.confirm) { setSignupError('كلمة المرور غير متطابقة'); return }
    const res = await signup({ username: form.username, name: form.name, role: form.role, password: form.password })
    if (!res.ok) { setSignupError(res.error ?? 'خطأ'); return }
    setSignupSuccess(true)
    setTimeout(() => { setPage('login'); setSignupSuccess(false); setForm({ username:'', name:'', role:'Viewer', password:'', confirm:'' }) }, 1800)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-800 to-red-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white rounded-xl px-4 py-2 shadow-xl">
            <img src="/logo.png" alt="Alsaif Gallery" className="h-20 object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-white text-xl font-bold">Inventory & Stock Control</h1>
            <p className="text-red-200 text-sm">السيف غاليري</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            <button onClick={() => setPage('login')}
              className={`flex-1 py-3.5 text-sm font-bold transition-colors ${page==='login' ? 'bg-red-700 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              تسجيل الدخول
            </button>
            <button onClick={() => setPage('signup')}
              className={`flex-1 py-3.5 text-sm font-bold transition-colors ${page==='signup' ? 'bg-red-700 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              إنشاء حساب
            </button>
          </div>

          <div className="p-8">
            {/* ── LOGIN ── */}
            {page === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">اسم المستخدم</label>
                  <input className="mt-1 w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                    placeholder="أدخل اسم المستخدم" value={username} onChange={e => setUsername(e.target.value)} autoComplete="on"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">كلمة المرور</label>
                  <div className="relative mt-1">
                    <input type={showPw ? 'text' : 'password'}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors pl-12"
                      placeholder="أدخل كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} autoComplete="on"/>
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">{showPw ? '🙈' : '👁️'}</button>
                  </div>
                </div>
                {loginError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 text-center">{loginError}</div>}
                <button type="submit" disabled={loginLoading || !username || !password}
                  className="w-full bg-red-700 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-sm">
                  {loginLoading ? 'جاري التحقق...' : 'دخول'}
                </button>
              </form>
            )}

            {/* ── SIGNUP ── */}
            {page === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4" autoComplete="off">
                {signupSuccess && (
                  <div className="bg-green-50 border border-green-300 rounded-xl px-4 py-3 text-sm text-green-700 text-center font-semibold">
                    تم إنشاء الحساب بنجاح! 🎉
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">الاسم الكامل</label>
                  <input className="mt-1 w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                    placeholder="الاسم كما سيظهر في النظام" value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">اسم المستخدم</label>
                  <input className="mt-1 w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                    placeholder="يستخدم عند تسجيل الدخول" value={form.username} onChange={e => setForm({...form, username: e.target.value})}/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">الدور الوظيفي</label>
                  <select className="mt-1 w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500"
                    value={form.role} onChange={e => setForm({...form, role: e.target.value as typeof ROLES[number]})}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">كلمة المرور</label>
                  <div className="relative mt-1">
                    <input type={showSpw ? 'text' : 'password'}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors pl-12"
                      placeholder="6 أحرف على الأقل" value={form.password} onChange={e => setForm({...form, password: e.target.value})}/>
                    <button type="button" onClick={() => setShowSpw(!showSpw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">{showSpw ? '🙈' : '👁️'}</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">تأكيد كلمة المرور</label>
                  <input type="password"
                    className="mt-1 w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                    placeholder="أعد إدخال كلمة المرور" value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})}/>
                </div>
                {signupError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 text-center">{signupError}</div>}
                <button type="submit" disabled={!form.username || !form.name || !form.password || !form.confirm}
                  className="w-full bg-red-700 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-sm">
                  إنشاء الحساب
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-red-300 text-xs">Alsaif Gallery © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}










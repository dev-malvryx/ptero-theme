import React, { useEffect, useRef, useState } from 'react';
import { Link, RouteComponentProps } from 'react-router-dom';
import login from '@/api/auth/login';
import type { LoginResponse } from '@/api/auth/login';
import { useStoreState } from 'easy-peasy';
import { Formik, FormikHelpers } from 'formik';
import { object, string } from 'yup';
import Reaptcha from 'reaptcha';
import useFlash from '@/plugins/useFlash';
import type { ApplicationStore } from '@/state';

interface Values {
    username: string;
    password: string;
}

/* ─── Particle canvas ─── */
function useParticleField(canvasRef: React.RefObject<HTMLCanvasElement>) {
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        let W: number, H: number, animId: number;
        let mouse = { x: -9999, y: -9999 };
        const N = 72, LINK = 130, PR = 200, PF = 0.012;
        type Node = { x: number; y: number; vx: number; vy: number; r: number; alpha: number };
        let nodes: Node[] = [];

        const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
        const spawn  = () => { nodes = Array.from({ length: N }, () => ({ x: Math.random()*W, y: Math.random()*H, vx:(Math.random()-.5)*.22, vy:(Math.random()-.5)*.22, r:Math.random()*1.4+.4, alpha:Math.random()*.4+.15 })); };

        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            nodes.forEach(n => {
                n.x += n.vx; n.y += n.vy;
                const dx = mouse.x-n.x, dy = mouse.y-n.y, d = Math.hypot(dx,dy);
                if (d < PR) { const f=(1-d/PR)*PF; n.vx+=dx*f; n.vy+=dy*f; }
                n.vx *= .995; n.vy *= .995;
                if (n.x<-10) n.x=W+10; if (n.x>W+10) n.x=-10;
                if (n.y<-10) n.y=H+10; if (n.y>H+10) n.y=-10;
            });
            for (let i=0;i<nodes.length;i++) for (let j=i+1;j<nodes.length;j++) {
                const a=nodes[i],b=nodes[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);
                if (d<LINK) {
                    const t=1-d/LINK,mx=(a.x+b.x)/2,my=(a.y+b.y)/2,cd=Math.hypot(mx-mouse.x,my-mouse.y),hot=Math.max(0,1-cd/PR);
                    const r=Math.round(108+(54-108)*hot),g=Math.round(114+(221-114)*hot),bv=Math.round(255+(171-255)*hot);
                    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
                    ctx.strokeStyle=`rgba(${r},${g},${bv},${t*.18})`; ctx.lineWidth=t*.8; ctx.stroke();
                }
            }
            nodes.forEach(n => {
                const cd=Math.hypot(n.x-mouse.x,n.y-mouse.y),hot=Math.max(0,1-cd/PR);
                const r=Math.round(108+(54-108)*hot),g=Math.round(114+(221-114)*hot),bv=Math.round(255+(171-255)*hot);
                ctx.beginPath(); ctx.arc(n.x,n.y,n.r+hot*1.2,0,Math.PI*2);
                ctx.fillStyle=`rgba(${r},${g},${bv},${n.alpha+hot*.45})`; ctx.fill();
            });
            animId = requestAnimationFrame(draw);
        };

        const onResize = () => { resize(); spawn(); };
        const onMove   = (e: MouseEvent) => { mouse.x=e.clientX; mouse.y=e.clientY; };
        const onTouch  = (e: TouchEvent) => { mouse.x=e.touches[0].clientX; mouse.y=e.touches[0].clientY; };
        window.addEventListener('resize', onResize);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onTouch, { passive: true });
        resize(); spawn(); draw();
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('touchmove', onTouch);
        };
    }, []);
}

/* ─── Main Component ─── */
const LoginContainer = ({ history }: RouteComponentProps) => {
    const ref       = useRef<Reaptcha>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [token, setToken]    = useState('');
    const [errorMsg, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { enabled: recaptchaEnabled, siteKey } = useStoreState((state: ApplicationStore) => state.settings.data!.recaptcha);

    useParticleField(canvasRef);
    useEffect(() => { clearFlashes(); }, []);

    const onSubmit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes(); setError('');
        if (recaptchaEnabled && !token) {
            ref.current!.execute().catch((error) => { console.error(error); setSubmitting(false); clearAndAddHttpError({ error }); });
            return;
        }
        login({ ...values, recaptchaData: token })
            .then((response: LoginResponse) => {
                if (response.complete) { (window.location as any) = response.intended || '/'; return; }
                history.replace('/auth/login/checkpoint', { token: response.confirmationToken });
            })
            .catch((error: unknown) => {
                console.error(error); setToken('');
                if (ref.current) ref.current.reset();
                setSubmitting(false);
                setError('Invalid credentials. Please try again.');
                clearAndAddHttpError({ error });
            });
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Geist+Mono:wght@300;400&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                :root {
                    --bg:#07080F; --surface:#0E1018; --surface2:#13151F;
                    --border:rgba(255,255,255,0.07); --text:#E8EAF0;
                    --muted:#555A6E; --muted2:#8890A4;
                    --accent:#6C72FF; --accent2:#36DDAB;
                    --danger:#FF5E5E; --tg:#29A8E0;
                }
                body { background:var(--bg)!important; font-family:'Syne',sans-serif!important; color:var(--text)!important; overflow:hidden!important; }
                @property --angle { syntax:'<angle>'; initial-value:0deg; inherits:false; }
                @keyframes orbFloat { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
                @keyframes driftA { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.05)} 66%{transform:translate(-20px,20px) scale(.97)} }
                @keyframes driftB { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-30px,-40px)} }
                @keyframes driftC { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(20px,30px) scale(1.08)} 80%{transform:translate(-10px,-15px) scale(.95)} }
                @keyframes rotateBorder { to{--angle:360deg} }
                @keyframes cardIn { from{opacity:0;transform:translateY(24px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
                @keyframes scan { from{top:-4px;opacity:1} to{top:100%;opacity:0} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
                @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
                @keyframes spin { to{transform:rotate(360deg)} }

                .dmh-page{min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
                .dmh-canvas{position:fixed;inset:0;z-index:0;pointer-events:none}
                .dmh-orb{position:fixed;border-radius:50%;filter:blur(110px);pointer-events:none;z-index:0}
                .dmh-orb-1{width:520px;height:520px;background:radial-gradient(circle,rgba(108,114,255,.22) 0%,transparent 70%);top:-160px;left:-100px;animation:orbFloat 1s ease forwards,driftA 18s ease-in-out infinite 1s}
                .dmh-orb-2{width:400px;height:400px;background:radial-gradient(circle,rgba(54,221,171,.15) 0%,transparent 70%);bottom:-100px;right:-60px;animation:orbFloat 1s ease forwards .3s,driftB 22s ease-in-out infinite 1.3s}
                .dmh-orb-3{width:280px;height:280px;background:radial-gradient(circle,rgba(108,114,255,.12) 0%,transparent 70%);top:40%;right:12%;animation:orbFloat 1s ease forwards .5s,driftC 26s ease-in-out infinite 1.5s}
                .dmh-wrap{position:relative;z-index:2;width:100%;max-width:420px;padding:0 16px}
                .dmh-shell{position:relative;border-radius:18px;padding:1.5px;background:conic-gradient(from var(--angle,0deg),#6C72FF 0deg,#36DDAB 90deg,#6C72FF 180deg,#36DDAB 270deg,#6C72FF 360deg);animation:rotateBorder 6s linear infinite,cardIn .7s cubic-bezier(.22,1,.36,1) .2s both;opacity:0}
                .dmh-card{background:var(--surface);border-radius:17px;padding:40px 38px 36px;position:relative;overflow:hidden}
                .dmh-card::before{content:'';position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(108,114,255,.5),rgba(54,221,171,.4),transparent)}
                .dmh-scanline{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent),var(--accent2),transparent);top:-4px;filter:blur(2px);animation:scan 1.1s cubic-bezier(.4,0,.2,1) .6s both;z-index:10}
                .dmh-brand{display:flex;align-items:center;gap:13px;margin-bottom:34px;opacity:0;animation:fadeUp .5s ease .95s forwards}
                .dmh-brand-name{font-size:16px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--text)}
                .dmh-brand-sub{font-family:'Geist Mono',monospace;font-size:10px;font-weight:300;letter-spacing:.18em;text-transform:uppercase;color:var(--muted2);margin-top:3px}
                .dmh-heading{margin-bottom:30px;opacity:0;animation:fadeUp .5s ease 1.05s forwards}
                .dmh-heading h1{font-size:26px;font-weight:700;color:var(--text);letter-spacing:-.01em;line-height:1.15}
                .dmh-heading h1 span{background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
                .dmh-heading p{font-family:'Geist Mono',monospace;font-size:12px;font-weight:300;color:var(--muted2);margin-top:7px;letter-spacing:.04em}
                .dmh-form{opacity:0;animation:fadeUp .5s ease 1.15s forwards}
                .dmh-group{margin-bottom:16px}
                .dmh-label{display:block;font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:400;letter-spacing:.12em;text-transform:uppercase;color:var(--muted2);margin-bottom:8px}
                .dmh-input-wrap{position:relative}
                .dmh-input-wrap svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;transition:color .2s}
                .dmh-input-wrap:focus-within svg{color:var(--accent)}
                .dmh-input{width:100%;padding:12px 14px 12px 40px;background:var(--surface2)!important;border:1px solid var(--border)!important;border-radius:9px!important;font-family:'Syne',sans-serif!important;font-size:14px!important;color:var(--text)!important;outline:none!important;transition:border-color .2s,box-shadow .2s!important}
                .dmh-input-pass{padding-right:84px!important}
                .dmh-pass-toggle{position:absolute;right:10px;top:50%;transform:translateY(-50%);border:none;background:transparent;color:var(--accent2);font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;opacity:.9;padding:4px 6px}
                .dmh-pass-toggle:hover{opacity:1}
                .dmh-pass-toggle:disabled{opacity:.5;cursor:not-allowed}
                .dmh-input::placeholder{color:var(--muted);font-size:13px}
                .dmh-input:focus{border-color:var(--accent)!important;background:#151724!important;box-shadow:0 0 0 3px rgba(108,114,255,.14),inset 0 0 0 1px rgba(108,114,255,.1)!important}
                .dmh-field-err{color:var(--danger);font-size:11px;margin-top:5px;font-family:'Geist Mono',monospace}
                .dmh-row{display:flex;align-items:center;justify-content:flex-end;margin:4px 0 22px}
                .dmh-forgot{font-size:12.5px;font-weight:500;color:var(--accent);text-decoration:none;opacity:.85;transition:opacity .15s}
                .dmh-forgot:hover{opacity:1}
                .dmh-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px;background:linear-gradient(135deg,var(--accent) 0%,#7C6AFE 50%,var(--accent2) 100%);background-size:200% 200%;background-position:0% 50%;color:#fff;font-family:'Syne',sans-serif;font-size:14px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border:none;border-radius:9px;cursor:pointer;transition:background-position .4s,transform .12s,box-shadow .3s;box-shadow:0 4px 20px rgba(108,114,255,.3)}
                .dmh-btn:hover{background-position:100% 50%;box-shadow:0 6px 28px rgba(108,114,255,.45)}
                .dmh-btn:active{transform:scale(.985)}
                .dmh-btn:disabled{opacity:.6;cursor:not-allowed}
                .dmh-btn .spinning{animation:spin 1s linear infinite}
                .dmh-error{display:flex;align-items:flex-start;gap:9px;background:rgba(255,94,94,.07);border:1px solid rgba(255,94,94,.25);border-radius:8px;padding:10px 13px;margin-bottom:16px;font-size:12.5px;color:var(--danger);line-height:1.45;animation:fadeUp .3s ease both}
                .dmh-divider{display:flex;align-items:center;gap:12px;margin:22px 0;opacity:0;animation:fadeUp .5s ease 1.25s forwards}
                .dmh-divider::before,.dmh-divider::after{content:'';flex:1;height:1px;background:var(--border)}
                .dmh-divider span{font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.1em;color:var(--muted)}
                .dmh-tg-block{opacity:0;animation:fadeUp .5s ease 1.32s forwards}
                .dmh-tg-info{font-family:'Geist Mono',monospace;font-size:11px;color:var(--muted2);text-align:center;margin-bottom:12px;line-height:1.6;letter-spacing:.02em}
                .dmh-tg-btn{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:12px;background:transparent;border:1px solid rgba(41,168,224,.3);border-radius:9px;color:var(--tg);font-family:'Syne',sans-serif;font-size:13.5px;font-weight:600;text-decoration:none;cursor:pointer;transition:background .2s,border-color .2s,box-shadow .2s}
                .dmh-tg-btn:hover{background:rgba(41,168,224,.09);border-color:rgba(41,168,224,.6);box-shadow:0 0 18px rgba(41,168,224,.15)}
                .dmh-status{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:22px;font-family:'Geist Mono',monospace;font-size:10px;color:var(--muted);letter-spacing:.1em;opacity:0;animation:fadeUp .5s ease 1.5s forwards}
                .dmh-dot{width:6px;height:6px;border-radius:50%;background:var(--accent2);box-shadow:0 0 6px var(--accent2);animation:pulse 2s ease-in-out infinite}
                .dmh-footer{margin-top:12px;text-align:center;font-family:'Geist Mono',monospace;font-size:10px;line-height:1.5;color:var(--muted2);letter-spacing:.04em;opacity:0;animation:fadeUp .5s ease 1.62s forwards}
            `}</style>

            <div className="dmh-page">
                <div className="dmh-orb dmh-orb-1" />
                <div className="dmh-orb dmh-orb-2" />
                <div className="dmh-orb dmh-orb-3" />
                <canvas className="dmh-canvas" ref={canvasRef} />

                <div className="dmh-wrap">
                    <div className="dmh-shell">
                        <div className="dmh-card">
                            <div className="dmh-scanline" />

                            {/* Brand */}
                            <div className="dmh-brand">
                                <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
                                    <defs>
                                        <linearGradient id="lg1" x1="0" y1="0" x2="42" y2="42" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#6C72FF"/><stop offset="100%" stopColor="#36DDAB"/>
                                        </linearGradient>
                                        <linearGradient id="lg2" x1="42" y1="0" x2="0" y2="42" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#36DDAB" stopOpacity="0.6"/><stop offset="100%" stopColor="#6C72FF" stopOpacity="0.6"/>
                                        </linearGradient>
                                    </defs>
                                    <path d="M21 3L37 12V30L21 39L5 30V12L21 3Z" fill="#0E1018" stroke="url(#lg1)" strokeWidth="1.2"/>
                                    <path d="M12 27V15L21 21L30 15V27" stroke="url(#lg1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M16 27V21" stroke="url(#lg2)" strokeWidth="1.5" strokeLinecap="round"/>
                                    <path d="M26 27V21" stroke="url(#lg2)" strokeWidth="1.5" strokeLinecap="round"/>
                                    <circle cx="21" cy="3" r="1.5" fill="#6C72FF"/>
                                    <circle cx="37" cy="30" r="1.5" fill="#36DDAB"/>
                                    <circle cx="5" cy="12" r="1.5" fill="#6C72FF" opacity="0.6"/>
                                </svg>
                                <div>
                                    <div className="dmh-brand-name">DEV MALVRYX</div>
                                    <div className="dmh-brand-sub">HOSTING PLATFORM</div>
                                </div>
                            </div>

                            {/* Heading */}
                            <div className="dmh-heading">
                                <h1>Sign <span>in.</span></h1>
                                <p>// Enter your credentials to continue</p>
                            </div>

                            {/* Error */}
                            {errorMsg && (
                                <div className="dmh-error">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                    </svg>
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {/* Form */}
                            <Formik
                                onSubmit={onSubmit}
                                initialValues={{ username: '', password: '' }}
                                validationSchema={object().shape({
                                    username: string().required('A username or email must be provided.'),
                                    password: string().required('Please enter your account password.'),
                                })}
                            >
                                {({ isSubmitting, submitForm, values, handleChange, handleBlur, errors, touched }) => (
                                    <div className="dmh-form">
                                        <div className="dmh-group">
                                            <label className="dmh-label" htmlFor="username">Email or Username</label>
                                            <div className="dmh-input-wrap">
                                                <input className="dmh-input" id="username" type="text" name="username" placeholder="user@malvryx.dev" value={values.username} onChange={handleChange} onBlur={handleBlur} disabled={isSubmitting} autoComplete="username"/>
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                            </div>
                                            {touched.username && errors.username && <div className="dmh-field-err">{errors.username}</div>}
                                        </div>

                                        <div className="dmh-group">
                                            <label className="dmh-label" htmlFor="password">Password</label>
                                            <div className="dmh-input-wrap">
                                                <input className="dmh-input dmh-input-pass" id="password" type={showPassword ? 'text' : 'password'} name="password" placeholder="••••••••••••" value={values.password} onChange={handleChange} onBlur={handleBlur} disabled={isSubmitting} autoComplete="current-password"/>
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                                <button className="dmh-pass-toggle" type="button" onClick={() => setShowPassword((value) => !value)} disabled={isSubmitting}>
                                                    {showPassword ? 'Hide' : 'Show'}
                                                </button>
                                            </div>
                                            {touched.password && errors.password && <div className="dmh-field-err">{errors.password}</div>}
                                        </div>

                                        <div className="dmh-row">
                                            <Link to="/auth/password" className="dmh-forgot">Forgot password?</Link>
                                        </div>

                                        <button className="dmh-btn" type="button" disabled={isSubmitting} onClick={() => submitForm()}>
                                            <svg className={isSubmitting ? 'spinning' : ''} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                {isSubmitting
                                                    ? <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                                                    : <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></>
                                                }
                                            </svg>
                                            {isSubmitting ? 'Signing in...' : 'Sign In'}
                                        </button>

                                        {recaptchaEnabled && (
                                            <Reaptcha
                                                ref={ref}
                                                size="invisible"
                                                sitekey={siteKey || '_invalid_key'}
                                                onVerify={(response) => { setToken(response); submitForm(); }}
                                                onExpire={() => { setToken(''); }}
                                            />
                                        )}
                                    </div>
                                )}
                            </Formik>

                            {/* Telegram */}
                            <div className="dmh-divider"><span>NO ACCOUNT?</span></div>
                            <div className="dmh-tg-block">
                                <p className="dmh-tg-info">
                                    Accounts are provisioned via our Telegram bot.<br/>
                                    Start a chat to get registered instantly.
                                </p>
                                <a href="https://t.me/PteroFreePanelBot" target="_blank" rel="noreferrer" className="dmh-tg-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                    </svg>
                                    Generate Account via Telegram
                                </a>
                            </div>

                            {/* Status */}
                            <div className="dmh-status">
                                <div className="dmh-dot" />
                                <span>All systems operational</span>
                            </div>
                            <div className="dmh-footer">
                                Owned &amp; developed by Dev Malvryx<br/>
                                Dev Malvryx Hosting Company
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoginContainer;

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import requestPasswordResetEmail from '@/api/auth/requestPasswordResetEmail';
import { httpErrorToHuman } from '@/api/http';
import { useStoreState } from 'easy-peasy';
import { Formik, FormikHelpers } from 'formik';
import { object, string } from 'yup';
import Reaptcha from 'reaptcha';
import useFlash from '@/plugins/useFlash';
import type { ApplicationStore } from '@/state';

interface Values {
    email: string;
}

const ForgotPasswordContainer = () => {
    const ref = useRef<Reaptcha>(null);
    const [token, setToken] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const { clearFlashes, addFlash } = useFlash();
    const { enabled: recaptchaEnabled, siteKey } = useStoreState((state: ApplicationStore) => state.settings.data!.recaptcha);

    useEffect(() => {
        clearFlashes();
    }, []);

    const onSubmit = ({ email }: Values, { setSubmitting, resetForm }: FormikHelpers<Values>) => {
        clearFlashes();
        setErrorMsg('');
        setSuccessMsg('');

        if (recaptchaEnabled && !token) {
            ref.current!.execute().catch((error) => {
                const message = httpErrorToHuman(error);
                console.error(error);
                setSubmitting(false);
                setErrorMsg(message);
                addFlash({ type: 'error', title: 'Error', message });
            });

            return;
        }

        requestPasswordResetEmail(email, token)
            .then((response) => {
                resetForm();
                setSuccessMsg(response);
                addFlash({ type: 'success', title: 'Success', message: response });
            })
            .catch((error) => {
                const message = httpErrorToHuman(error);
                console.error(error);
                setErrorMsg(message);
                addFlash({ type: 'error', title: 'Error', message });
            })
            .then(() => {
                setToken('');
                if (ref.current) {
                    ref.current.reset();
                }

                setSubmitting(false);
            });
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                :root {
                    --bg:#07080F; --surface:#0E1018; --surface2:#13151F;
                    --border:rgba(255,255,255,0.07); --text:#E8EAF0;
                    --muted:#555A6E; --muted2:#8890A4;
                    --accent:#6C72FF; --accent2:#36DDAB;
                    --danger:#FF5E5E; --tg:#29A8E0;
                    --success:#36DDAB;
                }
                body { background:var(--bg)!important; font-family:'Manrope',sans-serif!important; color:var(--text)!important; }

                .dmh-page{min-height:100vh;display:flex;align-items:center;justify-content:center;background:
                    radial-gradient(circle at 20% 12%, rgba(108,114,255,.2) 0%, transparent 42%),
                    radial-gradient(circle at 82% 84%, rgba(54,221,171,.14) 0%, transparent 40%),
                    var(--bg)}
                .dmh-wrap{position:relative;z-index:2;width:100%;max-width:420px;padding:20px 16px}
                .dmh-shell{position:relative;border-radius:18px;padding:1px;background:linear-gradient(130deg, rgba(108,114,255,.65), rgba(54,221,171,.42))}
                .dmh-card{background:var(--surface);border-radius:17px;padding:34px 30px 28px;position:relative;overflow:hidden}
                .dmh-card::before{content:'';position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(108,114,255,.5),rgba(54,221,171,.4),transparent)}
                .dmh-brand{display:flex;align-items:center;gap:13px;margin-bottom:26px}
                .dmh-brand-name{font-size:16px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--text)}
                .dmh-brand-sub{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;color:var(--muted2);margin-top:3px}
                .dmh-heading{margin-bottom:22px}
                .dmh-heading h1{font-size:26px;font-weight:700;color:var(--text);letter-spacing:-.01em;line-height:1.15}
                .dmh-heading h1 span{background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
                .dmh-heading p{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:400;color:var(--muted2);margin-top:7px;letter-spacing:.03em}
                .dmh-group{margin-bottom:16px}
                .dmh-label{display:block;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:400;letter-spacing:.1em;text-transform:uppercase;color:var(--muted2);margin-bottom:8px}
                .dmh-input-wrap{position:relative}
                .dmh-input-wrap svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none}
                .dmh-input{width:100%;padding:12px 14px 12px 40px;background:var(--surface2)!important;border:1px solid var(--border)!important;border-radius:9px!important;font-family:'Manrope',sans-serif!important;font-size:14px!important;color:var(--text)!important;outline:none!important}
                .dmh-input::placeholder{color:var(--muted);font-size:13px}
                .dmh-input:focus{border-color:var(--accent)!important;background:#151724!important;box-shadow:0 0 0 3px rgba(108,114,255,.14),inset 0 0 0 1px rgba(108,114,255,.1)!important}
                .dmh-field-err{color:var(--danger);font-size:11px;margin-top:5px;font-family:'JetBrains Mono',monospace}
                .dmh-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px;background:linear-gradient(135deg,var(--accent) 0%,#7C6AFE 50%,var(--accent2) 100%);color:#fff;font-family:'Manrope',sans-serif;font-size:14px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border:none;border-radius:9px;cursor:pointer;box-shadow:0 4px 20px rgba(108,114,255,.28)}
                .dmh-btn:hover{box-shadow:0 6px 24px rgba(108,114,255,.38)}
                .dmh-btn:disabled{opacity:.6;cursor:not-allowed}
                .dmh-message{display:flex;align-items:flex-start;gap:9px;border-radius:8px;padding:10px 13px;margin-bottom:16px;font-size:12.5px;line-height:1.45}
                .dmh-message-error{background:rgba(255,94,94,.07);border:1px solid rgba(255,94,94,.25);color:var(--danger)}
                .dmh-message-success{background:rgba(54,221,171,.07);border:1px solid rgba(54,221,171,.25);color:var(--success)}
                .dmh-row{display:flex;align-items:center;justify-content:center;margin:16px 0 0}
                .dmh-back{font-size:12.5px;font-weight:600;color:var(--accent);text-decoration:none;opacity:.9}
                .dmh-back:hover{opacity:1}
                .dmh-footer{margin-top:14px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;line-height:1.5;color:var(--muted2);letter-spacing:.04em}
                @media (max-width: 480px){
                    .dmh-card{padding:28px 22px 24px}
                }
            `}</style>

            <Formik
                onSubmit={onSubmit}
                initialValues={{ email: '' }}
                validationSchema={object().shape({
                    email: string()
                        .email('A valid email address must be provided to continue.')
                        .required('A valid email address must be provided to continue.'),
                })}
            >
                {({ isSubmitting, submitForm, values, handleChange, handleBlur, errors, touched, setSubmitting }) => (
                    <div className="dmh-page">
                        <div className="dmh-wrap">
                            <div className="dmh-shell">
                                <div className="dmh-card">
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

                                    <div className="dmh-heading">
                                        <h1>Reset <span>password.</span></h1>
                                        <p>// Enter your email to receive reset instructions</p>
                                    </div>

                                    {errorMsg && <div className="dmh-message dmh-message-error">{errorMsg}</div>}
                                    {successMsg && <div className="dmh-message dmh-message-success">{successMsg}</div>}

                                    <div className="dmh-group">
                                        <label className="dmh-label" htmlFor="email">Account Email</label>
                                        <div className="dmh-input-wrap">
                                            <input
                                                className="dmh-input"
                                                id="email"
                                                type="email"
                                                name="email"
                                                placeholder="you@example.com"
                                                value={values.email}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                disabled={isSubmitting}
                                                autoComplete="email"
                                            />
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                        </div>
                                        {touched.email && errors.email && <div className="dmh-field-err">{errors.email}</div>}
                                    </div>

                                    <button className="dmh-btn" type="button" disabled={isSubmitting} onClick={() => submitForm()}>
                                        {isSubmitting ? 'Sending...' : 'Send Reset Email'}
                                    </button>

                                    {recaptchaEnabled && (
                                        <Reaptcha
                                            ref={ref}
                                            size="invisible"
                                            sitekey={siteKey || '_invalid_key'}
                                            onVerify={(response) => {
                                                setToken(response);
                                                submitForm();
                                            }}
                                            onExpire={() => {
                                                setSubmitting(false);
                                                setToken('');
                                            }}
                                        />
                                    )}

                                    <div className="dmh-row">
                                        <Link to="/auth/login" className="dmh-back">Return to Login</Link>
                                    </div>

                                    <div className="dmh-footer">
                                        Owned &amp; developed by Dev Malvryx<br/>
                                        Dev Malvryx Hosting Company
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Formik>
        </>
    );
};

export default ForgotPasswordContainer;

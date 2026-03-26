import React, { forwardRef } from 'react';
import { Form } from 'formik';
import FlashMessageRender from '@/components/FlashMessageRender';

import Attribution from '@blueprint/extends/Attribution';
import BeforeContent from '@blueprint/components/Authentication/Container/BeforeContent';
import AfterContent from '@blueprint/components/Authentication/Container/AfterContent';

type Props = React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement> & {
    title?: string;
};

export default forwardRef<HTMLFormElement, Props>(({ title, children, ...props }, ref) => (
    <div className="dmh-auth-shell">
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
            .dmh-auth-shell{max-width:760px;margin:0 auto;padding:20px 16px}
            .dmh-auth-title{font-family:'Manrope',sans-serif;font-size:30px;font-weight:800;letter-spacing:-.02em;color:#E8EAF0;text-align:center;margin-bottom:12px}
            .dmh-auth-form{border:1px solid rgba(255,255,255,0.09);border-radius:16px;padding:26px 22px;background:linear-gradient(180deg,rgba(14,16,24,.96),rgba(14,16,24,.86));box-shadow:0 22px 40px rgba(0,0,0,.25)}
            .dmh-auth-footer{margin-top:14px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;line-height:1.6;color:#8890A4;letter-spacing:.04em}
            .dmh-auth-footer a{color:#8890A4;text-decoration:none}
            .dmh-auth-footer a:hover{color:#A8B0C4}
            @media (max-width: 480px){
                .dmh-auth-title{font-size:26px}
                .dmh-auth-form{padding:22px 16px}
            }
        `}</style>
        {title && <h2 className="dmh-auth-title">{title}</h2>}
        <FlashMessageRender />
        <BeforeContent />
        <Form {...props} ref={ref}>
            <div className="dmh-auth-form">{children}</div>
        </Form>
        <AfterContent />
        <p className="dmh-auth-footer">
            <a rel={'noopener nofollow noreferrer'} href={'https://pterodactyl.io'} target={'_blank'}>
                Pterodactyl&reg;
            </a>
            &copy; 2015 - {new Date().getFullYear()} <Attribution />
        </p>
    </div>
));

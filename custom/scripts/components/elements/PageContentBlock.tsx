import React, { useEffect } from 'react';
import ContentContainer from '@/components/elements/ContentContainer';
import { CSSTransition } from 'react-transition-group';
import FlashMessageRender from '@/components/FlashMessageRender';
import styled from 'styled-components/macro';

export interface PageContentBlockProps {
    title?: string;
    className?: string;
    showFlashKey?: string;
}

import Attribution from '@blueprint/extends/Attribution';
import BeforeSection from '@blueprint/components/Dashboard/Global/BeforeSection';
import AfterSection from '@blueprint/components/Dashboard/Global/AfterSection';

const Surface = styled.div`
    min-height: calc(100vh - 3.6rem);
    background:
        radial-gradient(circle at 15% 12%, rgba(108, 114, 255, 0.12) 0%, transparent 38%),
        radial-gradient(circle at 82% 86%, rgba(54, 221, 171, 0.08) 0%, transparent 34%),
        #313f50;
`;

const SectionWrap = styled(ContentContainer)`
    margin-top: 1.2rem;
    margin-bottom: 1.8rem;

    @media (min-width: 640px) {
        margin-top: 2rem;
        margin-bottom: 2.2rem;
    }
`;

const FooterWrap = styled(ContentContainer)`
    margin-bottom: 1.4rem;
`;

const FooterText = styled.p`
    text-align: center;
    color: #8d97ab;
    font-size: 0.74rem;
    letter-spacing: 0.03em;

    a {
        color: #9aa4b9;
        text-decoration: none;
    }

    a:hover {
        color: #cad0de;
    }
`;

const PageContentBlock: React.FC<PageContentBlockProps> = ({ title, showFlashKey, className, children }) => {
    useEffect(() => {
        if (title) {
            document.title = title;
        }
    }, [title]);

    return (
        <CSSTransition timeout={150} classNames={'fade'} appear in>
            <Surface>
                <BeforeSection />
                <SectionWrap className={className}>
                    {showFlashKey && <FlashMessageRender byKey={showFlashKey} />}
                    {children}
                </SectionWrap>
                <AfterSection />
                <FooterWrap>
                    <FooterText>
                        <a rel={'noopener nofollow noreferrer'} href={'https://pterodactyl.io'} target={'_blank'}>
                            Pterodactyl&reg;
                        </a>
                        &nbsp;&copy; 2015 - {new Date().getFullYear()}
                        <Attribution />
                    </FooterText>
                </FooterWrap>
            </Surface>
        </CSSTransition>
    );
};

export default PageContentBlock;

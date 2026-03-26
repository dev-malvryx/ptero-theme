import React, { Suspense } from 'react';
import styled, { css, keyframes } from 'styled-components/macro';
import tw from 'twin.macro';
import ErrorBoundary from '@/components/elements/ErrorBoundary';

export type SpinnerSize = 'small' | 'base' | 'large';

interface Props {
    size?: SpinnerSize;
    centered?: boolean;
    isBlue?: boolean;
}

interface Spinner extends React.FC<Props> {
    Size: Record<'SMALL' | 'BASE' | 'LARGE', SpinnerSize>;
    Suspense: React.FC<Props>;
}

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const glow = keyframes`
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.05); }
`;

// noinspection CssOverwrittenProperties
const SpinnerComponent = styled.div<Props>`
    ${tw`w-8 h-8`};
    border-width: 3px;
    border-radius: 50%;
    animation: ${spin} 1s cubic-bezier(0.55, 0.25, 0.25, 0.7) infinite;

    ${(props) =>
        props.size === 'small'
            ? tw`w-4 h-4 border-2`
            : props.size === 'large'
            ? css`
                  ${tw`w-16 h-16`};
                  border-width: 6px;
              `
            : null};

    border-color: ${(props) => (!props.isBlue ? 'rgba(255, 255, 255, 0.2)' : 'hsla(212, 92%, 43%, 0.2)')};
    border-top-color: ${(props) => (!props.isBlue ? 'rgb(255, 255, 255)' : 'hsl(212, 92%, 43%)')};
`;

const SuspenseShell = styled.div`
    min-height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    background: radial-gradient(circle at 20% 20%, rgba(108, 114, 255, 0.2) 0%, transparent 45%),
        radial-gradient(circle at 80% 80%, rgba(54, 221, 171, 0.14) 0%, transparent 48%),
        #07080f;
`;

const SuspensePanel = styled.div`
    width: min(440px, calc(100% - 32px));
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 26px 24px;
    background: linear-gradient(180deg, rgba(14, 16, 24, 0.95), rgba(14, 16, 24, 0.82));
    backdrop-filter: blur(4px);
    text-align: center;
`;

const Brand = styled.div`
    font-family: 'Syne', sans-serif;
    font-size: 15px;
    letter-spacing: 0.08em;
    font-weight: 800;
    color: #e8eaf0;
    text-transform: uppercase;
`;

const SubBrand = styled.div`
    font-family: 'Geist Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.14em;
    color: #8890a4;
    margin-top: 4px;
    text-transform: uppercase;
`;

const LoaderWrap = styled.div`
    display: flex;
    justify-content: center;
    margin-top: 18px;
`;

const Status = styled.div`
    margin-top: 14px;
    font-family: 'Geist Mono', monospace;
    font-size: 11px;
    color: #9ba2b5;
    letter-spacing: 0.04em;
`;

const Dot = styled.span`
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    margin-right: 8px;
    background: #36ddab;
    box-shadow: 0 0 10px rgba(54, 221, 171, 0.8);
    animation: ${glow} 1.8s ease-in-out infinite;
`;

const Spinner: Spinner = ({ centered, ...props }) =>
    centered ? (
        <div css={[tw`flex justify-center items-center`, props.size === 'large' ? tw`m-20` : tw`m-6`]}>
            <SpinnerComponent {...props} />
        </div>
    ) : (
        <SpinnerComponent {...props} />
    );
Spinner.displayName = 'Spinner';

Spinner.Size = {
    SMALL: 'small',
    BASE: 'base',
    LARGE: 'large',
};

Spinner.Suspense = ({ children, centered = true, size = Spinner.Size.LARGE, ...props }) => (
    <Suspense
        fallback={
            <SuspenseShell>
                <SuspensePanel>
                    <Brand>Dev Malvryx</Brand>
                    <SubBrand>Hosting Platform</SubBrand>
                    <LoaderWrap>
                        <Spinner centered={centered} size={size} {...props} />
                    </LoaderWrap>
                    <Status>
                        <Dot />Preparing your panel...
                    </Status>
                </SuspensePanel>
            </SuspenseShell>
        }
    >
        <ErrorBoundary>{children}</ErrorBoundary>
    </Suspense>
);
Spinner.Suspense.displayName = 'Spinner.Suspense';

export default Spinner;

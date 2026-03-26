import * as React from 'react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCogs, faLayerGroup, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import SearchContainer from '@/components/dashboard/search/SearchContainer';
import tw, { theme } from 'twin.macro';
import styled from 'styled-components/macro';
import http from '@/api/http';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import Tooltip from '@/components/elements/tooltip/Tooltip';
import Avatar from '@/components/Avatar';

import BeforeNavigation from '@blueprint/components/Navigation/NavigationBar/BeforeNavigation';
import AdditionalItems from '@blueprint/components/Navigation/NavigationBar/AdditionalItems';
import AfterNavigation from '@blueprint/components/Navigation/NavigationBar/AfterNavigation';

const Shell = styled.div`
    ${tw`w-full overflow-x-auto border-b`};
    border-color: rgba(255, 255, 255, 0.08);
    background:
        linear-gradient(180deg, rgba(8, 10, 18, 0.96), rgba(8, 10, 18, 0.9)),
        radial-gradient(circle at top left, rgba(108, 114, 255, 0.18), transparent 40%);
    backdrop-filter: blur(6px);
`;

const RightNavigation = styled.div`
    & > a,
    & > button,
    & > .navigation-link {
        ${tw`flex items-center h-full no-underline px-5 cursor-pointer transition-all duration-150`};
        color: #b3bbcf;

        &:active,
        &:hover {
            color: #eef1f8;
            background: rgba(255, 255, 255, 0.04);
        }

        &:active,
        &:hover,
        &.active {
            box-shadow: inset 0 -2px ${theme`colors.cyan.500`.toString()};
        }
    }
`;

const Brand = styled(Link)`
    ${tw`text-2xl font-header font-semibold px-4 no-underline transition-colors duration-150`};
    color: #e8eaf0;

    &:hover {
        color: #ffffff;
    }
`;

export default () => {
    const name = useStoreState((state: ApplicationStore) => state.settings.data!.name);
    const rootAdmin = useStoreState((state: ApplicationStore) => state.user.data!.rootAdmin);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const onTriggerLogout = () => {
        setIsLoggingOut(true);
        http.post('/auth/logout').finally(() => {
            // @ts-expect-error this is valid
            window.location = '/';
        });
    };

    return (
        <Shell id={'NavigationBar'}>
            <BeforeNavigation />
            <SpinnerOverlay visible={isLoggingOut} />
            <div className={'mx-auto w-full flex items-center h-[3.6rem] max-w-[1200px]'}>
                <div id={'logo'} className={'flex-1'}>
                    <Brand to={'/'}>{name}</Brand>
                </div>
                <RightNavigation className={'flex h-full items-center justify-center'}>
                    <SearchContainer />
                    <Tooltip placement={'bottom'} content={'Dashboard'}>
                        <NavLink to={'/'} exact id={'NavigationDashboard'}>
                            <FontAwesomeIcon icon={faLayerGroup} />
                        </NavLink>
                    </Tooltip>
                    {rootAdmin && (
                        <Tooltip placement={'bottom'} content={'Admin'}>
                            <a href={'/admin'} rel={'noreferrer'} id={'NavigationAdmin'}>
                                <FontAwesomeIcon icon={faCogs} />
                            </a>
                        </Tooltip>
                    )}
                    <AdditionalItems />
                    <Tooltip placement={'bottom'} content={'Account Settings'}>
                        <NavLink to={'/account'} id={'NavigationAccount'}>
                            <span className={'flex items-center w-5 h-5'}>
                                <Avatar.User />
                            </span>
                        </NavLink>
                    </Tooltip>
                    <Tooltip placement={'bottom'} content={'Sign Out'}>
                        <button onClick={onTriggerLogout} id={'NavigationLogout'}>
                            <FontAwesomeIcon icon={faSignOutAlt} />
                        </button>
                    </Tooltip>
                </RightNavigation>
            </div>
            <AfterNavigation />
        </Shell>
    );
};

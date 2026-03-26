import React, { useEffect, useState } from 'react';
import { Server } from '@/api/server/getServer';
import getServers from '@/api/getServers';
import ServerRow from '@/components/dashboard/ServerRow';
import Spinner from '@/components/elements/Spinner';
import PageContentBlock from '@/components/elements/PageContentBlock';
import useFlash from '@/plugins/useFlash';
import { useStoreState } from 'easy-peasy';
import { usePersistedState } from '@/plugins/usePersistedState';
import Switch from '@/components/elements/Switch';
import tw from 'twin.macro';
import useSWR from 'swr';
import { PaginatedResult } from '@/api/http';
import Pagination from '@/components/elements/Pagination';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import type { ApplicationStore } from '@/state';

import BeforeContent from '@blueprint/components/Dashboard/Serverlist/BeforeContent';
import AfterContent from '@blueprint/components/Dashboard/Serverlist/AfterContent';

const DashboardHead = styled.div`
    ${tw`mb-6 rounded-xl border p-4 md:p-5`};
    border-color: rgba(255, 255, 255, 0.08);
    background:
        radial-gradient(circle at top right, rgba(108, 114, 255, 0.18), transparent 50%),
        radial-gradient(circle at bottom left, rgba(54, 221, 171, 0.12), transparent 45%),
        rgba(14, 16, 24, 0.9);
`;

const DashboardTitle = styled.h2`
    ${tw`text-xl md:text-2xl font-semibold flex items-center gap-3`};
    color: #e8eaf0;
`;

const DashboardSub = styled.p`
    ${tw`mt-2 text-sm`};
    color: #8890a4;
`;

const FilterWrap = styled.div`
    ${tw`mt-4 flex items-center justify-end gap-2`};
`;

const FilterText = styled.p`
    ${tw`uppercase text-xs`};
    color: #8890a4;
    letter-spacing: 0.08em;
`;

const EmptyState = styled.div`
    ${tw`text-center rounded-xl border px-6 py-10 text-sm`};
    border-color: rgba(255, 255, 255, 0.08);
    color: #9aa2b5;
    background: rgba(14, 16, 24, 0.75);
`;

export default () => {
    const { search } = useLocation();
    const defaultPage = Number(new URLSearchParams(search).get('page') || '1');

    const [page, setPage] = useState(!isNaN(defaultPage) && defaultPage > 0 ? defaultPage : 1);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const uuid = useStoreState((state: ApplicationStore) => state.user.data!.uuid);
    const rootAdmin = useStoreState((state: ApplicationStore) => state.user.data!.rootAdmin);
    const [showOnlyAdmin, setShowOnlyAdmin] = usePersistedState(`${uuid}:show_all_servers`, false);

    const { data: servers, error } = useSWR<PaginatedResult<Server>>(
        ['/api/client/servers', showOnlyAdmin && rootAdmin, page],
        () => getServers({ page, type: showOnlyAdmin && rootAdmin ? 'admin' : undefined })
    );

    useEffect(() => {
        if (!servers) return;
        if (servers.pagination.currentPage > 1 && !servers.items.length) {
            setPage(1);
        }
    }, [servers?.pagination.currentPage]);

    useEffect(() => {
        window.history.replaceState(null, document.title, `/${page <= 1 ? '' : `?page=${page}`}`);
    }, [page]);

    useEffect(() => {
        if (error) clearAndAddHttpError({ key: 'dashboard', error });
        if (!error) clearFlashes('dashboard');
    }, [error]);

    return (
        <PageContentBlock title={'Dashboard'} showFlashKey={'dashboard'}>
            <BeforeContent />
            <DashboardHead>
                <DashboardTitle>
                    <FontAwesomeIcon icon={faChartLine} />
                    Dashboard Overview
                </DashboardTitle>
                <DashboardSub>
                    <span className={'mr-2'}>
                        <FontAwesomeIcon icon={faLayerGroup} />
                    </span>
                    Manage servers with a cleaner, focused workspace.
                </DashboardSub>
                {rootAdmin && (
                    <FilterWrap>
                        <FilterText>{showOnlyAdmin ? "Showing others' servers" : 'Showing your servers'}</FilterText>
                        <Switch
                            name={'show_all_servers'}
                            defaultChecked={showOnlyAdmin}
                            onChange={() => setShowOnlyAdmin((s) => !s)}
                        />
                    </FilterWrap>
                )}
            </DashboardHead>

            {!servers ? (
                <Spinner centered size={'large'} />
            ) : (
                <Pagination data={servers} onPageSelect={setPage}>
                    {({ items }) =>
                        items.length > 0 ? (
                            items.map((server, index) => (
                                <ServerRow key={server.uuid} server={server} className={index > 0 ? 'mt-3' : undefined} />
                            ))
                        ) : (
                            <EmptyState>
                                {showOnlyAdmin
                                    ? 'There are no other servers to display.'
                                    : 'There are no servers associated with your account.'}
                            </EmptyState>
                        )
                    }
                </Pagination>
            )}
            <AfterContent />
        </PageContentBlock>
    );
};

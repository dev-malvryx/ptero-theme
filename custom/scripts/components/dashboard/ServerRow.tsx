import React, { memo, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEthernet, faHdd, faMemory, faMicrochip, faServer } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { Server } from '@/api/server/getServer';
import getServerResourceUsage, { ServerPowerState, ServerStats } from '@/api/server/getServerResourceUsage';
import { bytesToString, ip, mbToBytes } from '@/lib/formatters';
import tw from 'twin.macro';
import Spinner from '@/components/elements/Spinner';
import styled from 'styled-components/macro';
import isEqual from 'react-fast-compare';

import BeforeEntryName from '@blueprint/components/Dashboard/Serverlist/ServerRow/BeforeEntryName';
import AfterEntryName from '@blueprint/components/Dashboard/Serverlist/ServerRow/AfterEntryName';
import BeforeEntryDescription from '@blueprint/components/Dashboard/Serverlist/ServerRow/BeforeEntryDescription';
import AfterEntryDescription from '@blueprint/components/Dashboard/Serverlist/ServerRow/AfterEntryDescription';
import ResourceLimits from '@blueprint/components/Dashboard/Serverlist/ServerRow/ResourceLimits';

const isAlarmState = (current: number, limit: number): boolean => limit > 0 && current / (limit * 1024 * 1024) >= 0.9;

const Icon = memo(
    styled(FontAwesomeIcon)<{ $alarm: boolean }>`
        ${(props) => (props.$alarm ? tw`text-red-400` : tw`text-neutral-500`)}`,
    isEqual
);

const IconDescription = styled.p<{ $alarm: boolean }>`
    ${tw`text-sm ml-2`};
    ${(props) => (props.$alarm ? tw`text-white` : tw`text-neutral-300`)};
`;

const Row = styled(Link)<{ $status: ServerPowerState | undefined }>`
    ${tw`block rounded-xl border p-4 md:p-5 relative overflow-hidden`};
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(14, 16, 24, 0.86);

    &::before {
        content: '';
        ${tw`absolute left-0 top-0 bottom-0 w-1`};
        ${({ $status }) =>
            !$status || $status === 'offline'
                ? 'background:#ef4444;'
                : $status === 'running'
                ? 'background:#22c55e;'
                : 'background:#f59e0b;'}
    }

    &:hover {
        border-color: rgba(108, 114, 255, 0.45);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
    }
`;

const StatusPill = styled.span<{ $danger?: boolean }>`
    ${tw`rounded px-2 py-1 text-xs`};
    ${({ $danger }) =>
        $danger
            ? 'background: rgba(239,68,68,.2); color:#fecaca;'
            : 'background: rgba(115,115,115,.35); color:#e5e7eb;'}
`;

type Timer = ReturnType<typeof setInterval>;

export default ({ server, className }: { server: Server; className?: string }) => {
    const interval = useRef<Timer>(null) as React.MutableRefObject<Timer>;
    const [isSuspended, setIsSuspended] = useState(server.status === 'suspended');
    const [stats, setStats] = useState<ServerStats | null>(null);

    const getStats = () =>
        getServerResourceUsage(server.uuid)
            .then((data) => setStats(data))
            .catch((error) => console.error(error));

    useEffect(() => {
        setIsSuspended(stats?.isSuspended || server.status === 'suspended');
    }, [stats?.isSuspended, server.status]);

    useEffect(() => {
        if (isSuspended) return;

        getStats().then(() => {
            interval.current = setInterval(() => getStats(), 30000);
        });

        return () => {
            interval.current && clearInterval(interval.current);
        };
    }, [isSuspended]);

    const alarms = { cpu: false, memory: false, disk: false };
    if (stats) {
        alarms.cpu = server.limits.cpu === 0 ? false : stats.cpuUsagePercent >= server.limits.cpu * 0.9;
        alarms.memory = isAlarmState(stats.memoryUsageInBytes, server.limits.memory);
        alarms.disk = server.limits.disk === 0 ? false : isAlarmState(stats.diskUsageInBytes, server.limits.disk);
    }

    const diskLimit = server.limits.disk !== 0 ? bytesToString(mbToBytes(server.limits.disk)) : 'Unlimited';
    const memoryLimit = server.limits.memory !== 0 ? bytesToString(mbToBytes(server.limits.memory)) : 'Unlimited';
    const cpuLimit = server.limits.cpu !== 0 ? server.limits.cpu + ' %' : 'Unlimited';

    return (
        <Row to={`/server/${server.id}`} className={className} $status={stats?.status}>
            <div className={'grid grid-cols-12 gap-4 md:gap-6 items-center'}>
                <div className={'flex items-start col-span-12 sm:col-span-5 lg:col-span-6'}>
                    <div className={'mr-4 text-neutral-400 mt-1'}>
                        <FontAwesomeIcon icon={faServer} />
                    </div>
                    <div className={'min-w-0'}>
                        <BeforeEntryName />
                        <p className={'text-lg text-neutral-100 break-words'}>{server.name}</p>
                        <AfterEntryName />
                        {!!server.description && (
                            <div>
                                <BeforeEntryDescription />
                                <p className={'text-sm text-neutral-400 break-words line-clamp-2'}>{server.description}</p>
                                <AfterEntryDescription />
                            </div>
                        )}
                    </div>
                </div>

                <div className={'hidden lg:block lg:col-span-2'}>
                    <div className={'flex items-center justify-start text-neutral-400'}>
                        <FontAwesomeIcon icon={faEthernet} />
                        <p className={'text-xs ml-2 truncate'}>
                            {server.allocations
                                .filter((alloc) => alloc.isDefault)
                                .map((allocation) => (
                                    <React.Fragment key={allocation.ip + allocation.port.toString()}>
                                        {allocation.alias || ip(allocation.ip)}:{allocation.port}
                                    </React.Fragment>
                                ))}
                        </p>
                    </div>
                </div>

                <div className={'col-span-12 lg:col-span-4'}>
                    {!stats || isSuspended ? (
                        isSuspended ? (
                            <div className={'text-left lg:text-center'}>
                                <StatusPill $danger>{server.status === 'suspended' ? 'Suspended' : 'Connection Error'}</StatusPill>
                            </div>
                        ) : server.isTransferring || server.status ? (
                            <div className={'text-left lg:text-center'}>
                                <StatusPill>
                                    {server.isTransferring
                                        ? 'Transferring'
                                        : server.status === 'installing'
                                        ? 'Installing'
                                        : server.status === 'restoring_backup'
                                        ? 'Restoring Backup'
                                        : 'Unavailable'}
                                </StatusPill>
                            </div>
                        ) : (
                            <Spinner size={'small'} />
                        )
                    ) : (
                        <React.Fragment>
                            <div className={'grid grid-cols-1 sm:grid-cols-3 gap-3'}>
                                <div>
                                    <div className={'flex items-center'}>
                                        <Icon icon={faMicrochip} $alarm={alarms.cpu} />
                                        <IconDescription $alarm={alarms.cpu}>{stats.cpuUsagePercent.toFixed(2)} %</IconDescription>
                                    </div>
                                    <p className={'text-xs text-neutral-500 mt-1'}>of {cpuLimit}</p>
                                </div>
                                <div>
                                    <div className={'flex items-center'}>
                                        <Icon icon={faMemory} $alarm={alarms.memory} />
                                        <IconDescription $alarm={alarms.memory}>{bytesToString(stats.memoryUsageInBytes)}</IconDescription>
                                    </div>
                                    <p className={'text-xs text-neutral-500 mt-1'}>of {memoryLimit}</p>
                                </div>
                                <div>
                                    <div className={'flex items-center'}>
                                        <Icon icon={faHdd} $alarm={alarms.disk} />
                                        <IconDescription $alarm={alarms.disk}>{bytesToString(stats.diskUsageInBytes)}</IconDescription>
                                    </div>
                                    <p className={'text-xs text-neutral-500 mt-1'}>of {diskLimit}</p>
                                </div>
                            </div>
                            <ResourceLimits />
                        </React.Fragment>
                    )}
                </div>
            </div>
        </Row>
    );
};

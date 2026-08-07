import { useMemo, useState, type ReactNode } from 'react';
import {
    Box,
    Card,
    Typography,
    Chip,
    Tabs,
    Tab,
    TextField,
    InputAdornment,
    Button,
    IconButton,
    Avatar,
    Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import GroupsIcon from '@mui/icons-material/Groups';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloseIcon from '@mui/icons-material/Close';
import BadgeIcon from '@mui/icons-material/Badge';
import GavelIcon from '@mui/icons-material/Gavel';
import HistoryIcon from '@mui/icons-material/History';
import type { ApplicantMember, Referee, ReviewAction, ReviewLog } from '../Types/App_Referee_types';
import { loadReviewLogsFromStorage } from '../Types/App_Referee_types';
import ScrollBox from '../../components/ScrollBox';

// กรรมการ demo — ค่าเดียวกับใน RefereeReview.tsx (ยังไม่มีระบบ auth/session ของผู้ใช้จริงในสโคปนี้
// พอมี auth แล้วให้ทั้งสองหน้าดึงจาก context/hook เดียวกันแทนการ hardcode ซ้ำสองที่)
const DEFAULT_REFEREE: Referee = {
    refereeID: 'REF-001',
    fullname: 'Referee Demo',
    tournamentID: 't1',
};

const ACTION_TABS: { value: 'all' | ReviewAction; label: string }[] = [
    { value: 'all', label: 'All History' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
];

function actionChipSx(action: ReviewAction) {
    if (action === 'approved') return { color: 'success.main', borderColor: 'success.main', bgcolor: 'rgba(59,165,93,0.12)' };
    return { color: 'error.main', borderColor: 'error.main', bgcolor: 'rgba(242,63,66,0.12)' };
}

function actionLabel(action: ReviewAction) {
    return action === 'approved' ? 'Approved' : 'Rejected';
}

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatCard({ icon, label, value, color }: { icon: ReactNode; label: string; value: number; color: string }) {
    return (
        <Box
            sx={{
                flex: '1 1 160px',
                p: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                {icon}
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5 }}>
                    {label}
                </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color }}>
                {value}
            </Typography>
        </Box>
    );
}

function MemberSnapshotRow({ member }: { member: ApplicantMember }) {
    return (
        <Box
            sx={{
                p: 1.75,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'rgba(255,255,255,0.02)',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Avatar
                    src={member.avatar || undefined}
                    sx={{ width: 30, height: 30, bgcolor: 'primary.main', color: '#fff', fontWeight: 700, fontSize: 13 }}
                >
                    {member.name.charAt(0)}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {member.name}
                </Typography>
                {member.isOwner && (
                    <Chip
                        label="Captain"
                        size="small"
                        sx={{ height: 20, fontSize: 11, fontWeight: 600, bgcolor: 'rgba(88,101,242,0.15)', color: 'primary.main' }}
                    />
                )}
            </Box>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: member.portfolio ? 1 : 0 }}>
                <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        User ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {member.id}
                    </Typography>
                </Box>
                <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Game ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {member.gameUID || '—'}
                    </Typography>
                </Box>
                <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Role
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {member.role}
                    </Typography>
                </Box>
            </Box>

            {member.portfolio && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <BadgeIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                    <Typography
                        component="a"
                        href={member.portfolio.fileData}
                        download={member.portfolio.fileName}
                        variant="caption"
                        sx={{ color: 'primary.main', textDecoration: 'none' }}
                    >
                        {member.portfolio.fileName} · {formatFileSize(member.portfolio.fileSize)}
                    </Typography>
                </Box>
            )}
        </Box>
    );
}

// แผงรายละเอียด — read-only ล้วนๆ ไม่มีปุ่ม approve/reject เพราะเป็นการตรวจที่จบไปแล้ว
// โชว์ snapshot ของใบสมัคร ณ ตอนตรวจ + ใครตรวจ/ตรวจเมื่อไหร่/ผลเป็นยังไง
function LogDetailPanel({ log, onClose }: { log: ReviewLog; onClose: () => void }) {
    const app = log.applicationSnapshot;
    return (
        <Box
            role="dialog"
            aria-label="Review log detail"
            onClick={(e) => e.stopPropagation()}
            sx={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: { xs: '100%', sm: 460 },
                bgcolor: 'background.paper',
                borderLeft: '1px solid',
                borderColor: 'divider',
                boxShadow: '-8px 0 24px rgba(0,0,0,0.35)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1301,
            }}
        >
            <Box sx={{ p: 2.5, pb: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Review Log Detail
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        #{log.appID} · {log.logID}
                    </Typography>
                </Box>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            <ScrollBox sx={{ flex: 1, p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                        <Avatar
                            src={app.team.logo || undefined}
                            variant="rounded"
                            sx={{ width: 36, height: 36, bgcolor: 'primary.main', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}
                        >
                            {log.teamName.charAt(0)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
                                {log.teamName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {app.team.members.length} members
                            </Typography>
                        </Box>
                    </Box>
                    <Chip
                        label={actionLabel(log.action)}
                        size="small"
                        sx={{ fontWeight: 700, border: '1px solid', flexShrink: 0, ...actionChipSx(log.action) }}
                    />
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: -1.5 }}>
                    {log.tournamentName} · {log.game}
                </Typography>

                <Divider />

                {/* ใครตรวจ เมื่อไหร่ — ใจความหลักของ ReviewLog */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.75,
                        p: 1.75,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'rgba(88,101,242,0.06)',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <GavelIcon sx={{ fontSize: 15, color: 'primary.main' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Reviewed by {log.reviewerName} ({log.refereeID})
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarMonthIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {formatDateTime(log.reviewDate)}
                        </Typography>
                    </Box>
                </Box>

                <Divider />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Roster at time of review
                    </Typography>
                    {app.team.members.map((m) => (
                        <MemberSnapshotRow key={m.id} member={m} />
                    ))}
                </Box>

                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        Screener note
                    </Typography>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'rgba(255,255,255,0.02)',
                            minHeight: 40,
                        }}
                    >
                        <Typography variant="body2" sx={{ color: log.note ? 'text.primary' : 'text.disabled' }}>
                            {log.note || 'No additional notes'}
                        </Typography>
                    </Box>
                </Box>
            </ScrollBox>
        </Box>
    );
}

function LogCard({ log, onView }: { log: ReviewLog; onView: () => void }) {
    const isApproved = log.action === 'approved';
    return (
        <Card
            sx={{
                bgcolor: 'background.paper',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 'none',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    <Avatar
                        src={log.applicationSnapshot.team.logo || undefined}
                        variant="rounded"
                        sx={{ width: 34, height: 34, bgcolor: 'primary.main', color: '#fff', fontWeight: 700, fontSize: 14 }}
                    >
                        {log.teamName.charAt(0)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                            {log.teamName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                            {log.tournamentName} · {log.game}
                        </Typography>
                    </Box>
                </Box>
                <Chip
                    icon={isApproved ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <HighlightOffIcon sx={{ fontSize: 14 }} />}
                    label={actionLabel(log.action)}
                    size="small"
                    sx={{ fontWeight: 700, border: '1px solid', flexShrink: 0, ...actionChipSx(log.action) }}
                />
            </Box>

            <Divider sx={{ my: 0.25 }} />

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <GavelIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Reviewed by <strong style={{ color: 'inherit' }}>{log.reviewerName}</strong>
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <CalendarMonthIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatDateTime(log.reviewDate)}
                    </Typography>
                </Box>
            </Box>

            {log.note && (
                <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }} noWrap>
                    "{log.note}"
                </Typography>
            )}

            <Button
                variant="outlined"
                onClick={onView}
                sx={{ textTransform: 'none', borderRadius: 2, mt: 0.5, alignSelf: 'flex-start' }}
            >
                View Application
            </Button>
        </Card>
    );
}

interface ReviewLogPageProps {
    referee?: Referee; // กรรมการที่ล็อกอินอยู่ — ใช้กรองว่าเห็นเฉพาะประวัติของทัวร์นาเมนต์ตัวเองเท่านั้น เหมือน RefereeReview.tsx
}

export default function ReviewLogPage({ referee = DEFAULT_REFEREE }: ReviewLogPageProps) {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<ReviewLog[]>(() => loadReviewLogsFromStorage());
    const [actionFilter, setActionFilter] = useState<'all' | ReviewAction>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [viewLogID, setViewLogID] = useState<string | null>(null);

    // referee เห็นได้เฉพาะประวัติของทัวร์นาเมนต์ที่ตัวเองผูกไว้ (referee.tournamentID) เท่านั้น เหมือนหน้า Review
    const myLogs = useMemo(() => logs.filter((l) => l.tournamentID === referee.tournamentID), [logs, referee.tournamentID]);

    const counts = useMemo(
        () => ({
            approved: myLogs.filter((l) => l.action === 'approved').length,
            rejected: myLogs.filter((l) => l.action === 'rejected').length,
            total: myLogs.length,
        }),
        [myLogs]
    );

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const fromTime = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
        const toTime = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null;
        return myLogs
            .filter((l) => {
                const matchesAction = actionFilter === 'all' || l.action === actionFilter;
                const matchesSearch =
                    !q ||
                    l.teamName.toLowerCase().includes(q) ||
                    l.tournamentName.toLowerCase().includes(q) ||
                    l.appID.toLowerCase().includes(q) ||
                    l.reviewerName.toLowerCase().includes(q);
                const reviewTime = new Date(l.reviewDate).getTime();
                const matchesDate = (fromTime === null || reviewTime >= fromTime) && (toTime === null || reviewTime <= toTime);
                return matchesAction && matchesSearch && matchesDate;
            })
            .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()); // ล่าสุดก่อน
    }, [myLogs, actionFilter, searchQuery, dateFrom, dateTo]);

    const viewLog = filtered.find((l) => l.logID === viewLogID) ?? myLogs.find((l) => l.logID === viewLogID) ?? null;

    return (
        <Box sx={{ p: 4, maxWidth: 1100, mx: 'auto', width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton size="small" onClick={() => navigate('/referee')} sx={{ mt: 0.25 }}>
                        <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        Review Log
                    </Typography>
                </Box>
                <Chip
                    icon={<HistoryIcon sx={{ fontSize: 16, color: 'primary.main !important' }} />}
                    label={referee.fullname}
                    sx={{ fontWeight: 600, bgcolor: 'rgba(88,101,242,0.12)', color: 'primary.main', flexShrink: 0 }}
                />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Full review history — who approved or rejected, when, and application details at that time
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
                <StatCard icon={<CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />} label="APPROVED" value={counts.approved} color="success.main" />
                <StatCard icon={<HighlightOffIcon sx={{ fontSize: 16, color: 'error.main' }} />} label="REJECTED" value={counts.rejected} color="error.main" />
                <StatCard icon={<GroupsIcon sx={{ fontSize: 16, color: 'primary.main' }} />} label="TOTAL REVIEWED" value={counts.total} color="primary.main" />
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 1 }}>
                <Tabs
                    value={actionFilter}
                    onChange={(_, v) => setActionFilter(v)}
                    sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none', fontWeight: 600 } }}
                >
                    {ACTION_TABS.map((t) => (
                        <Tab
                            key={t.value}
                            value={t.value}
                            label={t.value === 'all' ? `${t.label} (${counts.total})` : `${t.label} (${counts[t.value]})`}
                        />
                    ))}
                </Tabs>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                    <TextField
                        size="small"
                        type="date"
                        label="From"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.02)' } }}
                    />
                    <TextField
                        size="small"
                        type="date"
                        label="To"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.02)' } }}
                    />
                    {(dateFrom || dateTo) && (
                        <Button
                            size="small"
                            onClick={() => {
                                setDateFrom('');
                                setDateTo('');
                            }}
                            sx={{ textTransform: 'none' }}
                        >
                            Clear dates
                        </Button>
                    )}
                    <TextField
                        size="small"
                        placeholder="Search team, tournament, reviewer, app ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                        sx={{ minWidth: 280, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.02)' } }}
                    />
                </Box>
            </Box>

            {filtered.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
                    No review history matches your filters
                </Typography>
            )}

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 2,
                    mt: filtered.length ? 2 : 0,
                }}
            >
                {filtered.map((l) => (
                    <LogCard key={l.logID} log={l} onView={() => setViewLogID(l.logID)} />
                ))}
            </Box>

            {viewLog && (
                <Box
                    onClick={() => setViewLogID(null)}
                    sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1300 }}
                >
                    <LogDetailPanel log={viewLog} onClose={() => setViewLogID(null)} />
                </Box>
            )}
        </Box>
    );
}
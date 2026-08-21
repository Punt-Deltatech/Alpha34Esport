import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    Box,
    Card,
    Typography,
    Chip,
    TextField,
    InputAdornment,
    Button,
    IconButton,
    Avatar,
    Divider,
    CircularProgress,
    Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import GroupsIcon from '@mui/icons-material/Groups';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloseIcon from '@mui/icons-material/Close';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BadgeIcon from '@mui/icons-material/Badge';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import GavelIcon from '@mui/icons-material/Gavel';
import HistoryIcon from '@mui/icons-material/History';
import { useNavigate } from 'react-router-dom';
import type { Application, ApplicantMember, ApplicationStatus, Referee } from '../Types/App_Referee_types';
import { mapApplication } from '../Types/App_Referee_types';
import ScrollBox from '../../components/ScrollBox';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import * as applicationService from '../../services/applicationService';
import { extractApiErrorMessage } from '../../lib/apiClient';

function statusChipSx(status: ApplicationStatus) {
    if (status === 'approved') return { color: 'success.main', borderColor: 'success.main', bgcolor: 'rgba(59,165,93,0.12)' };
    if (status === 'rejected') return { color: 'error.main', borderColor: 'error.main', bgcolor: 'rgba(242,63,66,0.12)' };
    return { color: 'warning.main', borderColor: 'warning.main', bgcolor: 'rgba(240,171,60,0.12)' };
}

function statusLabel(status: ApplicationStatus) {
    if (status === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    return 'Pending';
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

function MemberDetailRow({ member, requireAttachment }: { member: ApplicantMember; requireAttachment: boolean }) {
    const missingPortfolio = requireAttachment && !member.portfolio;
    return (
        <Box
            sx={{
                p: 1.75,
                borderRadius: 2,
                border: '1px solid',
                borderColor: missingPortfolio ? 'warning.main' : 'divider',
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

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: member.portfolio || missingPortfolio ? 1 : 0 }}>
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

            {member.portfolio ? (
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
            ) : (
                missingPortfolio && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <WarningAmberIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                        <Typography variant="caption" sx={{ color: 'warning.main' }}>
                            Portfolio not attached yet
                        </Typography>
                    </Box>
                )
            )}
        </Box>
    );
}

function ApplicantDetailPanel({
    application,
    onClose,
    onDecide,
}: {
    application: Application;
    onClose: () => void;
    onDecide: (status: ApplicationStatus, note: string) => void;
}) {
    const [note, setNote] = useState(application.screenerNote);
    const [noteRequiredError, setNoteRequiredError] = useState(false);
    const missingCount = application.requireAttachment
        ? application.team.members.filter((m) => !m.portfolio).length
        : 0;
    const canApprove = missingCount === 0;

    const handleReject = () => {
        if (!note.trim()) {
            setNoteRequiredError(true);
            return;
        }
        onDecide('rejected', note);
    };

    return (
        <Box
            role="dialog"
            aria-label="Applicant detail"
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
                        Applicant Detail
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        #{application.appID} · {formatDate(application.submittedDate)}
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
                            src={application.team.logo || undefined}
                            variant="rounded"
                            sx={{ width: 36, height: 36, bgcolor: 'primary.main', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}
                        >
                            {application.team.name.charAt(0)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
                                {application.team.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {application.team.members.length} members
                            </Typography>
                        </Box>
                    </Box>
                    <Chip
                        label={statusLabel(application.status)}
                        size="small"
                        sx={{ fontWeight: 700, border: '1px solid', flexShrink: 0, ...statusChipSx(application.status) }}
                    />
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: -1.5 }}>
                    {application.tournamentName} · {application.game}
                </Typography>

                {application.requireAttachment && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AttachFileIcon sx={{ fontSize: 15, color: missingCount > 0 ? 'warning.main' : 'success.main' }} />
                        <Typography variant="caption" sx={{ color: missingCount > 0 ? 'warning.main' : 'success.main' }}>
                            {missingCount > 0
                                ? `Missing Portfolio for ${missingCount} more member(s) — required before you can approve`
                                : 'All members have attached Portfolio'}
                        </Typography>
                    </Box>
                )}

                <Divider />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    {application.team.members.map((m) => (
                        <MemberDetailRow key={m.id} member={m} requireAttachment={application.requireAttachment} />
                    ))}
                </Box>

                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        Screener note {noteRequiredError && <Typography component="span" variant="caption" sx={{ color: 'error.main' }}>(required to reject)</Typography>}
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        placeholder="Add screening note..."
                        value={note}
                        onChange={(e) => {
                            setNote(e.target.value);
                            if (noteRequiredError && e.target.value.trim()) setNoteRequiredError(false);
                        }}
                        error={noteRequiredError}
                        helperText={noteRequiredError ? 'You must provide a reason before rejecting the application' : ' '}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' } }}
                    />
                </Box>

                {application.reviewDate && (
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        Reviewed on {formatDate(application.reviewDate)}
                    </Typography>
                )}
            </ScrollBox>

            <Box sx={{ p: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5 }}>
                <Button
                    fullWidth
                    variant={application.status === 'rejected' ? 'contained' : 'outlined'}
                    color="error"
                    startIcon={<HighlightOffIcon />}
                    onClick={handleReject}
                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                >
                    Reject
                </Button>
                <Button
                    fullWidth
                    variant={application.status === 'approved' ? 'contained' : 'outlined'}
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    disabled={!canApprove}
                    onClick={() => onDecide('approved', note)}
                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                >
                    Approve
                </Button>
            </Box>
        </Box>
    );
}

function ApplicationCard({ application, onReview }: { application: Application; onReview: () => void }) {
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
                        src={application.team.logo || undefined}
                        variant="rounded"
                        sx={{ width: 34, height: 34, bgcolor: 'primary.main', color: '#fff', fontWeight: 700, fontSize: 14 }}
                    >
                        {application.team.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                            {application.team.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarMonthIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {formatDate(application.submittedDate)}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                <Chip
                    label={statusLabel(application.status)}
                    size="small"
                    sx={{ fontWeight: 700, border: '1px solid', flexShrink: 0, ...statusChipSx(application.status) }}
                />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <GroupsIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Member Roster
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {application.team.members.map((m) => (
                    <Chip
                        key={m.id}
                        label={`${m.name}${m.isOwner ? ' (Captain)' : ` (${m.role})`}`}
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: 'text.secondary', fontWeight: 500 }}
                    />
                ))}
            </Box>

            <Button
                variant="outlined"
                onClick={onReview}
                sx={{ textTransform: 'none', borderRadius: 2, mt: 0.5 }}
            >
                Review Application
            </Button>
        </Card>
    );
}

export default function RefereeReview() {
    const { user } = useAuth();
    const [referee, setReferee] = useState<Referee | null>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState(''); // yyyy-mm-dd, '' = ไม่กรอง
    const [dateTo, setDateTo] = useState('');
    const [reviewTargetID, setReviewTargetID] = useState<string | null>(null);
    // ตั้งค่าตอนกด Approve/Reject ในแผงตรวจ — ยังไม่ commit จริง รอ referee ยืนยันใน ConfirmDialog ก่อน
    const [pendingDecision, setPendingDecision] = useState<{ status: ApplicationStatus; note: string } | null>(null);
    const navigate = useNavigate();

    const reload = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError('');
        try {
            // ยังไม่มี endpoint "referee ของฉัน" โดยตรง — หาเอาจาก listReferees() แล้ว match profile_id
            const referees = await applicationService.listReferees();
            const mine = referees.find((r) => r.profile_id === user.id) ?? null;
            setReferee(mine ? { refereeID: mine.id, fullname: mine.fullname, tournamentID: mine.tournament_id } : null);

            if (mine) {
                const apps = await applicationService.listApplicationsForTournament(mine.tournament_id);
                setApplications(apps.map(mapApplication));
            } else {
                setApplications([]);
            }
        } catch (err) {
            setError(extractApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void reload();
    }, [reload]);

    // referee เห็นได้เฉพาะใบสมัครของทัวร์นาเมนต์ที่ตัวเองผูกไว้เท่านั้น (already filtered by the API call above)
    const myApplications = applications;

    const myTournamentName = myApplications[0]?.tournamentName ?? null;

    // เหลือแค่ใบสมัครที่ยัง pending เท่านั้น — Application.status เป็นค่าจริงจาก backend อยู่แล้ว
    // (ApplicationController.Review แก้ status ตรงๆ) ไม่ต้อง derive จาก ReviewLog เหมือนของเดิมอีกต่อไป
    const pendingApplications = useMemo(
        () => myApplications.filter((a) => a.status === 'pending'),
        [myApplications]
    );

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const fromTime = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
        const toTime = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null;
        return pendingApplications.filter((a) => {
            const matchesSearch =
                !q ||
                a.team.name.toLowerCase().includes(q) ||
                a.tournamentName.toLowerCase().includes(q) ||
                a.appID.toLowerCase().includes(q);
            const submittedTime = new Date(a.submittedDate).getTime();
            const matchesDate = (fromTime === null || submittedTime >= fromTime) && (toTime === null || submittedTime <= toTime);
            return matchesSearch && matchesDate;
        });
    }, [pendingApplications, searchQuery, dateFrom, dateTo]);

    // จัดกลุ่มตามทัวร์นาเมนต์ (เรียงตามลำดับที่เจอครั้งแรก) — เหมือนการที่ referee ไล่ดูทีละทัวร์นาเมนต์
    const groups = useMemo(() => {
        const order: string[] = [];
        const map = new Map<string, Application[]>();
        for (const a of filtered) {
            if (!map.has(a.tournamentID)) {
                map.set(a.tournamentID, []);
                order.push(a.tournamentID);
            }
            map.get(a.tournamentID)!.push(a);
        }
        return order.map((id) => ({ tournamentID: id, apps: map.get(id)! }));
    }, [filtered]);

    // reviewTarget ต้องหาจาก pendingApplications เท่านั้น — กัน referee เปิดใบสมัครทัวร์นาเมนต์อื่นแม้จะเดา appID ถูก
    // และสำคัญกว่านั้นคือกันไม่ให้เปิดใบสมัครที่ถูกตัดสินไปแล้ว (approved/rejected) กลับมาแก้ไขซ้ำที่หน้านี้ได้อีก
    const reviewTarget = pendingApplications.find((a) => a.appID === reviewTargetID) ?? null;

    // เรียกจากปุ่ม Approve/Reject ในแผงตรวจ — แค่เปิด ConfirmDialog รอ referee ยืนยันอีกที ยังไม่แก้ข้อมูลจริง
    const handleRequestDecide = (status: ApplicationStatus, note: string) => {
        if (!reviewTargetID) return;
        setPendingDecision({ status, note });
    };

    // commit จริงหลัง referee กดยืนยันใน ConfirmDialog เท่านั้น — เรียก API จริง (backend อัปเดต
    // Application.status, สร้าง WhitelistTeam ถ้า approve, และเก็บ ReviewLog ให้เองทั้งหมด)
    const handleConfirmDecide = async () => {
        if (!reviewTargetID || !pendingDecision) return;
        const { status, note } = pendingDecision;
        try {
            await applicationService.reviewApplication(
                reviewTargetID,
                status === 'approved' ? 'Approved' : 'Rejected',
                note,
            );
            await reload();
        } catch (err) {
            window.alert(extractApiErrorMessage(err));
        } finally {
            setPendingDecision(null);
            setReviewTargetID(null);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (!referee) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="warning">
                    Your account is not registered as a Referee for any tournament — ask an Admin to assign you the
                    Referee role and link a Referee record before you can review applications.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 4, maxWidth: 1100, mx: 'auto', width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    Referee Review
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Chip
                        icon={<GavelIcon sx={{ fontSize: 16, color: 'primary.main !important' }} />}
                        label={myTournamentName ? `${referee.fullname} · ${myTournamentName}` : `${referee.fullname} · No tournament assigned`}
                        sx={{ fontWeight: 600, bgcolor: 'rgba(88,101,242,0.12)', color: 'primary.main' }}
                    />
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<HistoryIcon sx={{ fontSize: 18 }} />}
                        onClick={() => navigate('/referee/logs')}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                    >
                        Review Log
                    </Button>
                </Box>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Review applications and approve teams joining tournaments you manage
            </Typography>

            {/* Stat overview — เหลือแค่ Pending เท่านั้น เพราะใบสมัครที่ approve/reject แล้วย้ายไปหน้า Review Log
                ไม่นับรวม/ไม่แสดงที่หน้านี้อีกต่อไป ดูสถิติ approved/rejected ได้ที่หน้า Review Log แทน */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
                <StatCard icon={<PendingActionsIcon sx={{ fontSize: 16, color: 'warning.main' }} />} label="PENDING REVIEW" value={pendingApplications.length} color="warning.main" />
            </Box>

            {/* Search + date filters — ไม่มี status tabs แล้วเพราะหน้านี้แสดงเฉพาะ pending เสมอ */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Pending Applications ({pendingApplications.length})
                </Typography>

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
                        placeholder="Search team, tournament, app ID..."
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
                        sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.02)' } }}
                    />
                </Box>
            </Box>

            {groups.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
                    No applications match your filters
                </Typography>
            )}

            {groups.map((group) => {
                const first = group.apps[0];

                return (
                    <Box key={group.tournamentID} sx={{ mt: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {first.tournamentName}
                            </Typography>
                            <Chip
                                icon={<SportsEsportsIcon sx={{ fontSize: 14, color: 'text.primary !important' }} />}
                                label={first.game}
                                size="small"
                                sx={{ fontWeight: 600, bgcolor: 'rgba(255,255,255,0.04)', color: 'text.primary' }}
                            />
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {group.apps.length} Pending
                            </Typography>
                        </Box>

                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: 2,
                            }}
                        >
                            {group.apps.map((a) => (
                                <ApplicationCard key={a.appID} application={a} onReview={() => setReviewTargetID(a.appID)} />
                            ))}
                        </Box>
                    </Box>
                );
            })}

            {reviewTarget && (
                <Box
                    onClick={() => setReviewTargetID(null)}
                    sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1300 }}
                >
                    <ApplicantDetailPanel
                        application={reviewTarget}
                        onClose={() => setReviewTargetID(null)}
                        onDecide={handleRequestDecide}
                    />
                </Box>
            )}

            {pendingDecision && reviewTarget && (
                <ConfirmDialog
                    title={pendingDecision.status === 'approved' ? 'Confirm Application Approval' : 'Confirm Application Rejection'}
                    description={
                        pendingDecision.status === 'approved'
                            ? `Team "${reviewTarget.team.name}" will be approved to join ${reviewTarget.tournamentName}. This review will be recorded under your name.`
                            : `Team "${reviewTarget.team.name}" will be rejected from ${reviewTarget.tournamentName}. This review will be recorded under your name.`
                    }
                    confirmLabel={pendingDecision.status === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
                    confirmColor={pendingDecision.status === 'approved' ? 'primary' : 'error'}
                    onConfirm={handleConfirmDecide}
                    onClose={() => setPendingDecision(null)}
                />
            )}
        </Box>
    );
}
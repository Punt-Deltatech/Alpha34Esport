import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Card,
    Typography,
    Button,
    Chip,
    IconButton,
    Collapse,
    LinearProgress,
    TextField,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    CircularProgress,
    Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PaidIcon from '@mui/icons-material/Paid';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupsIcon from '@mui/icons-material/Groups';
import SearchIcon from '@mui/icons-material/Search';
import type { ApplicationStatus, Tournament, TournamentUIState } from '../Types/Tournament_types';
import { mapTournament } from '../Types/Tournament_types';
import type { Team } from '../Types/Team_types';
import { mapApiTeamToTeam } from '../Types/Team_types';
import SignupConfirmModal from './Signup_confrimModel';
// ตั้งชื่อ alias ตอน import เพราะ component นี้ชื่อ TournamentDetail เหมือนกับ type TournamentDetail ใน Tournament_types.ts
// statusMeta ถูก export มาจากไฟล์เดียวกัน ใช้ mapping สี/label เดียวกับที่ TournamentDetail (modal) ใช้ ไม่ต้องเขียนซ้ำ
import TournamentDetailModal, { statusMeta } from './Tournament_detail';
import WhitelistTeam from './WhiteList/WhiteListTeam';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import * as tournamentService from '../../services/tournamentService';
import * as teamService from '../../services/teamService';
import * as applicationService from '../../services/applicationService';
import { extractApiErrorMessage } from '../../lib/apiClient';

type TournamentRow = Tournament & TournamentUIState;

// ตัด description ให้เหลือแค่ย่อหน้าแรก (ก่อนหัวข้อ 📍/🏆/👥/📋 หรือขึ้นบรรทัดใหม่คู่) ไว้โชว์ในการ์ด
// รายละเอียดเต็มไปโชว์ที่ TournamentDetail (View Detail) แทน
function getShortDescription(description: string, maxLength = 140): string {
    // ตัดตรงจุดที่เจอหัวข้อย่อยอันแรก (📍 สถานที่ / 🏆 เงินรางวัล / 👥 จำนวนสมาชิก / 📋 กฎกติกา)
    const sectionMarkers = ['📍', '🏆', '👥', '📋'];
    let cutIndex = description.length;
    for (const marker of sectionMarkers) {
        const idx = description.indexOf(marker);
        if (idx !== -1 && idx < cutIndex) cutIndex = idx;
    }
    // หรือตัดตรงขึ้นบรรทัดใหม่คู่แรก (เว้นวรรคระหว่างย่อหน้า) แล้วแต่ว่าอันไหนมาก่อน
    const doubleNewlineIdx = description.indexOf('\n\n');
    if (doubleNewlineIdx !== -1 && doubleNewlineIdx < cutIndex) cutIndex = doubleNewlineIdx;

    let summary = description.slice(0, cutIndex).trim();

    if (summary.length > maxLength) {
        summary = summary.slice(0, maxLength).trim() + '…';
    } else if (cutIndex < description.length) {
        summary += '…';
    }

    return summary;
}
function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPrizePool(amount: number): string {
    return `$${amount.toLocaleString('en-US')}`;
}

export default function TournamentHub() {
    const { user } = useAuth();
    const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // ให้ขยายได้ทีละรายการ เหมือนภาพตัวอย่าง
    const [expandedID, setExpandedID] = useState<string | null>(null);
    // เก็บ id ของทัวร์นาเมนต์ที่กำลังจะยืนยันสมัคร (เปิด SignupConfirmModal)
    const [signupTargetID, setSignupTargetID] = useState<string | null>(null);
    // เก็บ id ของทัวร์นาเมนต์ที่กำลังดู detail (เปิด TournamentDetailModal)
    const [detailTargetID, setDetailTargetID] = useState<string | null>(null);
    // เก็บ id ของทัวร์นาเมนต์ที่กำลังดู "ทีมที่ผ่านการอนุมัติ" แบบเร็ว ๆ (ไม่ต้องเปิด TournamentDetailModal เต็ม)
    const [whitelistTargetID, setWhitelistTargetID] = useState<string | null>(null);
    // ทีมของ user คนนี้
    const [myTeam, setMyTeam] = useState<Team | null>(null);
    // คำค้นหาชื่อทัวร์นาเมนต์
    const [searchQuery, setSearchQuery] = useState('');
    // filter ตามเกม — 'All' คือไม่กรอง
    const [selectedGame, setSelectedGame] = useState<string>('All');

    const reload = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError('');
        try {
            const [apiTournaments, apiTeam] = await Promise.all([
                tournamentService.listTournaments(),
                teamService.getMyTeam(user.id),
            ]);
            const team = apiTeam ? mapApiTeamToTeam(apiTeam) : null;
            setMyTeam(team);

            const myApplications = team ? await applicationService.listApplicationsForTeam(team.id) : [];
            const statusByTournament = new Map<string, ApplicationStatus>();
            for (const a of myApplications) {
                statusByTournament.set(a.tournament_id, a.status.toLowerCase() as ApplicationStatus);
            }

            const rows = await Promise.all(
                apiTournaments.map(async (t): Promise<TournamentRow> => {
                    const whitelist = await applicationService.listWhitelistForTournament(t.id);
                    return {
                        ...mapTournament(t),
                        registeredTeamCount: whitelist.length,
                        applicationStatus: statusByTournament.get(t.id) ?? 'none',
                    };
                }),
            );
            setTournaments(rows);
            setExpandedID((prev) => prev ?? rows[0]?.tournamentID ?? null);
        } catch (err) {
            setError(extractApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const toggleExpand = (id: string) => {
        setExpandedID((prev) => (prev === id ? null : id));
    };

    // ยิงตอนกด "ยืนยันสมัคร" ใน SignupConfirmModal เท่านั้น ไม่ใช่ตอนกดปุ่ม Join ตรงๆ
    // ส่งใบสมัครแล้ว → ขึ้น "Pending" ก่อนเสมอ ยังไม่นับเป็นทีมที่ลงทะเบียนจริง
    // จนกว่า Referee/ผู้จัด จะ approve ใบสมัคร (Application.status: Pending → Approved) ถึงจะนับเข้า registeredTeamCount
    const handleConfirmSignUp = async (id: string) => {
        if (!myTeam) return; // เผื่อไว้ — ปกติ modal นี้เปิดได้ก็ต่อเมื่อมีทีมแล้ว

        try {
            await applicationService.submitApplication({
                tournament_id: id,
                team_id: myTeam.id,
            });
            setTournaments((prev) =>
                prev.map((t) =>
                    t.tournamentID === id
                        ? { ...t, applicationStatus: 'pending' as ApplicationStatus }
                        : t
                )
            );
        } catch (err) {
            window.alert(extractApiErrorMessage(err));
        } finally {
            setSignupTargetID(null);
            setDetailTargetID(null); // เผื่อสมัครจากใน detail modal ให้ปิดด้วย
        }
    };

    const signupTarget = tournaments.find((t) => t.tournamentID === signupTargetID) ?? null;
    const detailTarget = tournaments.find((t) => t.tournamentID === detailTargetID) ?? null;

    // รายชื่อเกมทั้งหมดที่มีอยู่จริงในข้อมูล เอาไว้ทำ filter chip แบบไดนามิก
    const games = Array.from(new Set(tournaments.map((t) => t.game)));

    const filteredTournaments = tournaments.filter((t) => {
        const matchesGame = selectedGame === 'All' || t.game === selectedGame;
        const matchesSearch = t.tournamentName.toLowerCase().includes(searchQuery.trim().toLowerCase());
        return matchesGame && matchesSearch;
    });

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

    return (
        <Box sx={{ p: 4, maxWidth: 900, mx: 'auto', width: '100%' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mb: 3 }}>
                Tournament Hub
            </Typography>

            {/* Search + filter ตามเกม */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
                <TextField
                    size="small"
                    placeholder="Search tournaments..."
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
                    sx={{
                        minWidth: 240,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 3,
                            bgcolor: 'rgba(255,255,255,0.02)',
                        },
                    }}
                />

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {['All', ...games].map((g) => {
                        const active = selectedGame === g;
                        return (
                            <Chip
                                key={g}
                                label={g}
                                onClick={() => setSelectedGame(g)}
                                sx={{
                                    fontWeight: 600,
                                    borderRadius: 5,
                                    bgcolor: active ? 'primary.main' : 'rgba(255,255,255,0.04)',
                                    color: active ? '#fff' : 'text.secondary',
                                    border: '1px solid',
                                    borderColor: active ? 'primary.main' : 'divider',
                                    '&:hover': {
                                        bgcolor: active ? 'primary.dark' : 'rgba(255,255,255,0.08)',
                                    },
                                }}
                            />
                        );
                    })}
                </Box>
            </Box>

            {filteredTournaments.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
                    No tournaments match your search
                </Typography>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filteredTournaments.map((t) => {
                    const isExpanded = expandedID === t.tournamentID;
                    const slotOpen = Math.max(0, t.detail.maxTeam - t.registeredTeamCount);
                    const fillPercent = Math.min(100, Math.round((t.registeredTeamCount / t.detail.maxTeam) * 100));
                    const isClosed = t.status !== 'open';
                    const hasApplied = t.applicationStatus === 'pending' || t.applicationStatus === 'approved';
                    const joinDisabled = hasApplied || isClosed || slotOpen === 0;
                    const joinLabel =
                        t.applicationStatus === 'pending'
                            ? 'Pending'
                            : t.applicationStatus === 'approved'
                                ? 'Registered'
                                : isClosed
                                    ? 'Ended'
                                    : slotOpen === 0
                                        ? 'Full'
                                        : 'Join';
                    const cardStatus = statusMeta(t.status);

                    return (
                        <Card
                            key={t.tournamentID}
                            sx={{
                                bgcolor: 'background.paper',
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                boxShadow: 'none',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Banner strip — trophy watermark + status chip, มาตรฐานเดียวกับภาพตัวอย่าง */}
                            <Box
                                onClick={() => toggleExpand(t.tournamentID)}
                                sx={{
                                    position: 'relative',
                                    height: 88,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: t.bannerUrl
                                        ? `url(${t.bannerUrl}) center / cover no-repeat`
                                        : 'linear-gradient(135deg, rgba(88,101,242,0.20), rgba(43,45,49,0.4))',
                                    overflow: 'hidden',
                                }}
                            >
                                {!t.bannerUrl && (
                                    <EmojiEventsIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.12)' }} />
                                )}
                                {/* กลุ่ม chip มุมซ้ายบน: status จริง (open/closed/ongoing/completed) + สถานะการสมัครของทีมเรา */}
                                <Box sx={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 0.75 }}>
                                    <Chip
                                        label={cardStatus.label}
                                        size="small"
                                        sx={{
                                            fontWeight: 600,
                                            bgcolor:
                                                cardStatus.color === 'primary'
                                                    ? 'rgba(88,101,242,0.15)'
                                                    : 'rgba(43,45,49,0.85)',
                                            border: '1px solid',
                                            borderColor:
                                                cardStatus.color === 'primary'
                                                    ? 'primary.main'
                                                    : cardStatus.color === 'success'
                                                        ? 'success.main'
                                                        : 'divider',
                                            color:
                                                cardStatus.color === 'primary'
                                                    ? 'primary.main'
                                                    : cardStatus.color === 'success'
                                                        ? 'success.main'
                                                        : 'text.secondary',
                                        }}
                                    />
                                    <Chip
                                        label={
                                            t.applicationStatus === 'approved'
                                                ? 'Registered'
                                                : t.applicationStatus === 'pending'
                                                    ? 'Pending'
                                                    : isClosed
                                                        ? 'Closed'
                                                        : 'Unregistered'
                                        }
                                        size="small"
                                        sx={{
                                            fontWeight: 600,
                                            bgcolor: 'rgba(43,45,49,0.85)',
                                            border: '1px solid',
                                            borderColor:
                                                t.applicationStatus === 'approved'
                                                    ? 'success.main'
                                                    : t.applicationStatus === 'pending'
                                                        ? 'warning.main'
                                                        : 'divider',
                                            color:
                                                t.applicationStatus === 'approved'
                                                    ? 'success.main'
                                                    : t.applicationStatus === 'pending'
                                                        ? 'warning.main'
                                                        : 'text.secondary',
                                        }}
                                    />
                                </Box>
                                <Chip
                                    label={t.game}
                                    size="small"
                                    sx={{
                                        position: 'absolute',
                                        top: 10,
                                        right: 10,
                                        fontWeight: 700,
                                        bgcolor: 'rgba(20,21,23,0.85)',
                                        color: 'text.primary',
                                    }}
                                />
                            </Box>

                            <Box sx={{ p: 2.5, pt: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', minWidth: 0 }} noWrap>
                                        {t.tournamentName}
                                    </Typography>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleExpand(t.tournamentID);
                                        }}
                                        sx={{
                                            color: 'primary.main',
                                            flexShrink: 0,
                                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s',
                                        }}
                                    >
                                        <ExpandMoreIcon fontSize="small" />
                                    </IconButton>
                                </Box>

                                {/* Icon stats row — เงินรางวัล / วันเริ่ม / จำนวนทีมสูงสุด */}
                                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <PaidIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                            {formatPrizePool(t.detail.prizePool)}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <CalendarMonthIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                            {formatDate(t.startDate)}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <GroupsIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                            Max {t.detail.maxTeam} teams
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Join — ปุ่มหลัก เปิด SignupConfirmModal ทันทีโดยไม่ต้อง expand ก่อน */}
                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    disabled={joinDisabled}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSignupTargetID(t.tournamentID);
                                    }}
                                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, py: 1 }}
                                >
                                    {joinLabel}
                                </Button>
                            </Box>

                            {/* Expanded content — รายละเอียดเพิ่มเติม + View Detail (Join ย้ายขึ้นไปอยู่บนการ์ดแล้ว) */}
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ px: 2.5, pb: 2.5, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.6 }}>
                                        {getShortDescription(t.detail.description)}
                                    </Typography>

                                    <Box sx={{ mb: 2.5 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                Team slot filled
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {t.registeredTeamCount} / {t.detail.maxTeam} · {slotOpen} open
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={fillPercent}
                                            sx={{
                                                height: 6,
                                                borderRadius: 3,
                                                bgcolor: 'divider',
                                                '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 3 },
                                            }}
                                        />
                                    </Box>

                                    {t.detail.requireAttachment && !hasApplied && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <AttachFileIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                                            <Typography variant="caption" sx={{ color: 'warning.main' }}>
                                                This tournament requires an additional file attachment at sign-up
                                            </Typography>
                                        </Box>
                                    )}

                                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<VisibilityIcon />}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDetailTargetID(t.tournamentID); // เปิด TournamentDetailModal
                                            }}
                                            sx={{ textTransform: 'none', borderRadius: 2 }}
                                        >
                                            View Detail
                                        </Button>

                                        <Button
                                            variant="outlined"
                                            startIcon={<GroupsIcon />}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setWhitelistTargetID(t.tournamentID); // เปิด popup ทีมที่ผ่านการอนุมัติ
                                            }}
                                            sx={{ textTransform: 'none', borderRadius: 2 }}
                                        >
                                            WhiteList Teams
                                        </Button>
                                    </Box>
                                </Box>
                            </Collapse>
                        </Card>
                    );
                })}
            </Box>

            {/* มีทีมแล้ว → เปิด modal ยืนยันสมัครแบบเต็ม พร้อมรายชื่อผู้เล่นจริง */}
            {signupTarget && myTeam && (
                <SignupConfirmModal
                    tournament={signupTarget}
                    team={myTeam}
                    onClose={() => setSignupTargetID(null)}
                    onConfirm={() => handleConfirmSignUp(signupTarget.tournamentID)}
                />
            )}

            {/* ยังไม่มีทีม → กันไว้ไม่ให้เปิด modal เปล่า แจ้งให้ไปสร้างทีมก่อน */}
            {signupTarget && !myTeam && (
                <ConfirmDialog
                    title="No Team Yet"
                    description="You need to create a team before you can register for a tournament — go to My Team to create one first."
                    confirmLabel="Create a Team"
                    confirmColor="primary"
                    onConfirm={() => {
                        window.location.href = '/myteam';
                    }}
                    onClose={() => setSignupTargetID(null)}
                />
            )}

            {detailTarget && (
                <TournamentDetailModal
                    tournament={detailTarget}
                    registeredTeamCount={detailTarget.registeredTeamCount}
                    applicationStatus={detailTarget.applicationStatus}
                    onClose={() => setDetailTargetID(null)}
                    onSignUp={() => setSignupTargetID(detailTarget.tournamentID)} // จาก detail กด Sign Up ก็เด้งไป confirm ต่อ
                />
            )}

            {/* popup เร็ว ๆ ดูแค่ทีมที่ผ่านการอนุมัติ ไม่ต้องเปิด TournamentDetailModal ทั้งหน้า
                (WhitelistTeam component เดียวกับที่ฝังอยู่ใน Tournament_detail.tsx) */}
            {whitelistTargetID && (
                <Dialog open onClose={() => setWhitelistTargetID(null)} maxWidth="xs" fullWidth>
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        WhiteList Teams
                        <IconButton size="small" onClick={() => setWhitelistTargetID(null)}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ pb: 3 }}>
                        <WhitelistTeam tournamentID={whitelistTargetID} />
                    </DialogContent>
                </Dialog>
            )}
        </Box>
    );
}
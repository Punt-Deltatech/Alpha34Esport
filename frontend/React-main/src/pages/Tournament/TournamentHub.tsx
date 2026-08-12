import { useEffect, useState } from 'react';
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
import type { Team } from '../Types/Team_types';
import SignupConfirmModal from './Signup_confrimModel';
// ตั้งชื่อ alias ตอน import เพราะ component นี้ชื่อ TournamentDetail เหมือนกับ type TournamentDetail ใน Tournament_types.ts
// statusMeta ถูก export มาจากไฟล์เดียวกัน ใช้ mapping สี/label เดียวกับที่ TournamentDetail (modal) ใช้ ไม่ต้องเขียนซ้ำ
import TournamentDetailModal, { statusMeta } from './Tournament_detail';
import WhitelistTeam from './WhiteList/WhiteListTeam';
import ConfirmDialog from '../../components/ConfirmDialog';
// path นี้อิงตามสมมติฐานว่า RefereeReview.tsx อยู่ที่ src/pages/Referee/ — ถ้าโครงสร้างโปรเจกต์จริงต่างจากนี้ ให้ปรับ path ตรงนี้
import type { Application, ApplicantMember } from '../Types/App_Referee_types';
import { loadApplicationsFromStorage, saveApplicationsToStorage } from '../Types/App_Referee_types';

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
// ยังไม่มี backend เชื่อมจริง จึงใช้ mock data ตามโครง struct ใหม่ไปก่อน (Tournament + TournamentDetail แบบ composition)
const MOCK_TOURNAMENTS: TournamentRow[] = [
    {
        tournamentID: 't1',
        tournamentName: 'VCT Champions 2026',
        game: 'Valorant',
        startDate: '2026-03-15T00:00:00Z',
        endDate: '2026-03-25T00:00:00Z',
        bannerUrl: '',
        status: 'open',
        detail: {
            tournamentID: 't1',
            maxTeam: 64,
            registerDeadline: '2026-03-10T00:00:00Z',
            prizePool: 250000,
            format: 'Double Elimination',
            organizer: 'Riot Games',
            description:
                `The premier Valorant championship featuring top teams from across the globe. All skill levels welcome — qualifiers bracket available for newcomers.

📍 Venue: Bangkok Arena, Thailand (LAN Final) / Online for qualifier rounds

🏆 Prize Breakdown
1st place: $150,000
2nd place: $70,000
3rd place: $30,000

👥 Team Size
Teams may have up to 8 members (including substitutes)
At least 5 starters are required to compete

📋 Rules
1. All players must have a verified Game UID
2. Any cheating software or third-party tools are strictly prohibited
3. Teams arriving more than 15 minutes late will forfeit the match
4. Referee decisions are final`,
            requireAttachment: false,
        },
        registeredTeamCount: 32,
        applicationStatus: 'none',
    },
    {
        tournamentID: 't2',
        tournamentName: 'ESL Pro League Season 29',
        game: 'CS2',
        startDate: '2026-04-02T00:00:00Z',
        endDate: '2026-04-15T00:00:00Z',
        bannerUrl: '',
        status: 'open',
        detail: {
            tournamentID: 't2',
            maxTeam: 32,
            registerDeadline: '2026-03-28T00:00:00Z',
            prizePool: 120000,
            format: 'Swiss',
            organizer: 'ESL Gaming',
            description:
                'ESL Pro League returns for its 29th season with teams competing across multiple regions for a spot in the global finals.',
            requireAttachment: true,
        },
        registeredTeamCount: 20,
        applicationStatus: 'none',
    },
    {
        tournamentID: 't3',
        tournamentName: 'ROV Season 99',
        game: 'RoV',
        startDate: '2026-04-20T00:00:00Z',
        endDate: '2026-04-28T00:00:00Z',
        bannerUrl: '',
        status: 'open',
        detail: {
            tournamentID: 't3',
            maxTeam: 16,
            registerDeadline: '2026-04-15T00:00:00Z',
            prizePool: 50000,
            format: 'Single Elimination',
            organizer: 'Garena Thailand',
            description:
                'The latest season of the RoV competitive circuit, open to all registered teams in the region.',
            requireAttachment: false,
        },
        registeredTeamCount: 8,
        applicationStatus: 'none',
    },
];

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPrizePool(amount: number): string {
    return `$${amount.toLocaleString('en-US')}`;
}

export default function TournamentHub() {
    const [tournaments, setTournaments] = useState<TournamentRow[]>(MOCK_TOURNAMENTS);
    // ให้ขยายได้ทีละรายการ เหมือนภาพตัวอย่าง
    const [expandedID, setExpandedID] = useState<string | null>(MOCK_TOURNAMENTS[0]?.tournamentID ?? null);
    // เก็บ id ของทัวร์นาเมนต์ที่กำลังจะยืนยันสมัคร (เปิด SignupConfirmModal)
    const [signupTargetID, setSignupTargetID] = useState<string | null>(null);
    // เก็บ id ของทัวร์นาเมนต์ที่กำลังดู detail (เปิด TournamentDetailModal)
    const [detailTargetID, setDetailTargetID] = useState<string | null>(null);
    // เก็บ id ของทัวร์นาเมนต์ที่กำลังดู "ทีมที่ผ่านการอนุมัติ" แบบเร็ว ๆ (ไม่ต้องเปิด TournamentDetailModal เต็ม)
    const [whitelistTargetID, setWhitelistTargetID] = useState<string | null>(null);
    // ทีมของ user คนนี้ — โหลดจาก localStorage เดียวกับที่ MyTeam/GetStarted ใช้จริง
    const [myTeam, setMyTeam] = useState<Team | null>(null);
    // คำค้นหาชื่อทัวร์นาเมนต์
    const [searchQuery, setSearchQuery] = useState('');
    // filter ตามเกม — 'All' คือไม่กรอง
    const [selectedGame, setSelectedGame] = useState<string>('All');

    useEffect(() => {
        const saved = localStorage.getItem('esports_team');
        if (saved) setMyTeam(JSON.parse(saved));
    }, []);

    const toggleExpand = (id: string) => {
        setExpandedID((prev) => (prev === id ? null : id));
    };

    // ยิงตอนกด "ยืนยันสมัคร" ใน SignupConfirmModal เท่านั้น ไม่ใช่ตอนกดปุ่ม Join ตรงๆ
    // เขียนใบสมัครลง localStorage (APPLICATIONS_STORAGE_KEY) ให้หน้า RefereeReview อ่านไปแสดงได้
    // (ย้ายมาจาก MyTeam.tsx — การสมัครทัวร์นาเมนต์ควรเกิดที่หน้า Tournament เท่านั้น ไม่ใช่ที่ My Team)
    // ส่งใบสมัครแล้ว → ขึ้น "Pending" ก่อนเสมอ ยังไม่นับเป็นทีมที่ลงทะเบียนจริง
    // จนกว่า Referee/ผู้จัด จะ approve ใบสมัคร (Application.status: pending → approved) ถึงจะนับเข้า registeredTeamCount
    const handleConfirmSignUp = (id: string) => {
        const tournament = tournaments.find((t) => t.tournamentID === id);
        if (!tournament || !myTeam) return; // เผื่อไว้ — ปกติ modal นี้เปิดได้ก็ต่อเมื่อมีทั้งสองอย่างแล้ว

        // snapshot roster ของทีม ณ ตอนสมัคร ตามที่ ApplicantMember ต้องการ (ไม่ผูกกับ Team ที่ live อยู่)
        // Member.isOwner เป็น optional (boolean | undefined) แต่ ApplicantMember.isOwner บังคับ boolean เสมอ จึง default เป็น false
        // Member.portfolio (Portfolio) มี fileData เป็น optional แต่ ApplicantMember.portfolio (PortfolioFile) บังคับ fileData ให้มีค่าเสมอ
        // ถ้า fileData ยังไม่มีจริง (เช่นยังไม่ได้แนบไฟล์) ถือว่ายังไม่มี portfolio ให้ตัดออกไปเลย
        const applicantMembers: ApplicantMember[] = myTeam.members.map((m) => ({
            id: m.userid,
            name: m.name,
            avatar: m.avatar,
            isOwner: m.isOwner ?? false,
            gameUID: m.gameUID,
            role: m.role,
            portfolio:
                m.portfolio && m.portfolio.fileData
                    ? {
                          fileName: m.portfolio.fileName ?? 'portfolio',
                          fileSize: m.portfolio.fileSize ?? 0,
                          fileData: m.portfolio.fileData,
                      }
                    : undefined,
        }));

        const newApplication: Application = {
            appID: `APP-${tournament.tournamentID}-${Date.now()}`,
            tournamentID: tournament.tournamentID,
            tournamentName: tournament.tournamentName,
            game: tournament.game,
            requireAttachment: tournament.detail.requireAttachment,
            team: { name: myTeam.name, members: applicantMembers },
            submittedDate: new Date().toISOString(),
            status: 'pending',
            screenerNote: '',
            reviewDate: null,
        };

        // ใช้ loadApplicationsFromStorage/saveApplicationsToStorage ตัวเดียวกับที่ RefereeReview.tsx ใช้อ่าน
        // (แทนการยุ่งกับ localStorage.getItem/setItem ตรง ๆ เอง) เพื่อให้แน่ใจว่าข้อมูลที่เขียนไปจะอยู่ใน
        // format เดียวกับที่หน้า Referee Review อ่าน — ถ้า schema การเก็บข้อมูลเปลี่ยนในอนาคต จะอัปเดตพร้อมกันที่เดียว
        // fallback เป็น [] เพราะ MOCK_APPLICATIONS สำหรับ seed ครั้งแรกเป็นหน้าที่ของ RefereeReview.tsx ไม่ใช่ที่นี่
        try {
            const existingApplications = loadApplicationsFromStorage([]);
            saveApplicationsToStorage([newApplication, ...existingApplications]);
        } catch {
            // เงียบไว้ก่อน — ยังไม่มี UI แจ้ง error กรณี localStorage เต็ม/ปิดใช้งาน
        }

        // TODO: เชื่อม API สมัครทีมจริงเมื่อมี backend
        setTournaments((prev) =>
            prev.map((t) =>
                t.tournamentID === id
                    ? { ...t, applicationStatus: 'pending' as ApplicationStatus }
                    : t
            )
        );
        setSignupTargetID(null);
        setDetailTargetID(null); // เผื่อสมัครจากใน detail modal ให้ปิดด้วย
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
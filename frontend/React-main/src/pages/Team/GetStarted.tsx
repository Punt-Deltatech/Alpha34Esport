import { useState, useEffect } from 'react';
import CreateTeamForm from './Form/CreateTeamForm';
import Myteam from './MyTeam';
import type { PersonalForm } from './Form/PersonalForm';
import type { Team } from '../Types/Team_types';

// ยังไม่มีระบบ login จริง จึงกำหนด currentUserId ให้ตรงกับ id ของผู้สร้างทีม (CreateTeamForm ตั้งให้เป็น '1' เสมอ)
const CURRENT_USER_ID = '1';

export default function MyTeam() {
  const [team, setTeam] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const loadFromStorage = () => {
      const saved = localStorage.getItem('esports_team');
      if (saved) setTeam(JSON.parse(saved));
    };

    loadFromStorage();
    setLoaded(true);

    // ถ้าหน้านี้เปิดค้างอยู่พอดีตอนกด "ยอมรับ" คำเชิญที่กระดิ่ง (NotificationBell เขียนสมาชิกใหม่
    // ผ่าน joinTeamAsMember ใน Team_types.ts) ให้ดึง team ล่าสุดมาโชว์ทันทีโดยไม่ต้อง reload หน้า
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'esports_team') loadFromStorage();
    };
    const handleCustom = () => loadFromStorage();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('esports-team-changed', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('esports-team-changed', handleCustom);
    };
  }, []);

  if (!loaded) return null;

  const handleUpdateMember = (memberId: string, data: PersonalForm) => {
    setTeam((prev: any) => {
      if (!prev) return prev;
      const updatedMembers = prev.members.map((m: any) =>
        m.userid === memberId
          ? {
              ...m,
              name: data.fullname,
              role: data.role,
              gameUID: data.gameUID,
              phone: data.phone,
              socialContact: data.socialContact,
              avatar: data.avatar,
              portfolio: data.portfolio ?? undefined,
            }
          : m
      );
      const updated = { ...prev, members: updatedMembers };
      localStorage.setItem('esports_team', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateTeam = (
    updates: Pick<Team, 'name' | 'game' | 'description' | 'maxMembers' | 'social' | 'logo'>
  ) => {
    setTeam((prev: any) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem('esports_team', JSON.stringify(updated));
      return updated;
    });
  };

  // ลบสมาชิกออกจากทีม (กัปตันเท่านั้นที่เรียกได้ — เช็คสิทธิ์แล้วใน MyTeam.tsx)
  const handleRemoveMember = (memberId: string) => {
    setTeam((prev: any) => {
      if (!prev) return prev;
      const updated = { ...prev, members: prev.members.filter((m: any) => m.userid !== memberId) };
      localStorage.setItem('esports_team', JSON.stringify(updated));
      return updated;
    });
  };

  if (team) {
    return (
      <Myteam
        team={team}
        currentUserId={CURRENT_USER_ID}
        onDisband={() => {
          localStorage.removeItem('esports_team');
          setTeam(null);
        }}
        onUpdateMember={handleUpdateMember}
        onUpdateTeam={handleUpdateTeam}
        onRemoveMember={handleRemoveMember}
      />
    );
  }

  // ถ้ากำลังเปิดฟอร์มอยู่ ให้โชว์แค่ฟอร์มอย่างเดียว ไม่โชว์การ์ดด้านบน
  if (showForm) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <CreateTeamForm
          onClose={() => setShowForm(false)}
          onCreate={(newTeam) => {
            setTeam(newTeam);
            setShowForm(false);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '400px', padding: '32px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#3f4147', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '24px' }}>
            👤
          </div>

          <p style={{ fontSize: '14px', color: '#949ba4', margin: '0 0 4px 0' }}>
            Hello, User
          </p>

          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: '0 0 8px 0' }}>
            You don't have a team yet!
          </h2>

          <p style={{ fontSize: '14px', color: '#949ba4', margin: '0 0 24px 0', lineHeight: '1.5' }}>
            Create your own team, invite your teammates, and start joining tournaments.
          </p>

          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px' }}
          >
            + Create Team
          </button>
        </div>
      </div>
    </div>
  );
}
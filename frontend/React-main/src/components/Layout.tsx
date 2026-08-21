import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import NotificationBell from '../pages/Notification/NotificationBell';
// ปรับ path นี้ให้ตรงกับตำแหน่งจริงของ ScrollBox.tsx ถ้าโครงสร้างโฟลเดอร์ไม่ตรงกับที่สมมติไว้
import { scrollbarStyles } from '../components/ScrollBox';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  // เปิด/ปิดเมนูย่อยของ Referee — auto เปิดถ้ากำลังอยู่ในหน้าที่ path ขึ้นต้นด้วย /referee
  const [refereeOpen, setRefereeOpen] = useState(location.pathname.startsWith('/referee'));

  return (
    <div className="app-container">
      {/* Sidebar ด้านซ้าย */}
      <div className="sidebar">
        <div>
          <div className="sidebar-logo">
            <span>🎮</span> 34Esport
          </div>

          <div className="sidebar-menu">
            <div 
              onClick={() => navigate('/')}
              className={`menu-item ${location.pathname === '/' ? 'active' : ''}`}
            >
              News Feed
            </div>

            <div 
              onClick={() => navigate('/myteam')}
              className={`menu-item ${location.pathname === '/myteam' ? 'active' : ''}`}
            >
              <span>My Team</span>
              <span>▼</span>
            </div>

            <div 
              onClick={() => navigate('/tournament')}
              className={`menu-item ${location.pathname === '/tournament' ? 'active' : ''}`}
            >
              <span>Tournament</span>
              <span>▼</span>
            </div>

            <div
              onClick={() => setRefereeOpen((prev) => !prev)}
              className={`menu-item ${location.pathname.startsWith('/referee') ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              <span>Referee</span>
              <span
                style={{
                  display: 'inline-block',
                  transition: 'transform 0.2s ease',
                  transform: refereeOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ▼
              </span>
            </div>

            {refereeOpen && (
              <div
                onClick={() => navigate('/referee')}
                className={`menu-item submenu-item ${location.pathname === '/referee' ? 'active' : ''}`}
                style={{ paddingLeft: '32px', cursor: 'pointer' }}
              >
                <span>Referee Review</span>
              </div>
            )}

            <div className="menu-item">
              News
            </div>
          </div>  
        </div>

        {/* โปรไฟล์มุมล่างซ้าย */}
        <div className="sidebar-footer">
          <div className="profile-info">
            <div className="avatar">👤</div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>
              Profile
            </span>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px' }}>Logout</button>
        </div>
      </div>

      {/* พื้นที่แสดงเนื้อหาหลัก */}
      <div className="content-area" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Topbar — กล่องจดหมายอยู่ตรงนี้ที่เดียว ติดทุกหน้าที่ผ่าน Layout นี้ */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 16px 0' }}>
          <NotificationBell />
        </div>

        {/* ตัวนี้คือ container ที่ scroll จริง (flex:1, minHeight:0) — ใส่ scrollbarStyles ที่นี่ที่เดียว
            แทนที่จะปล่อยให้แต่ละหน้า (เช่น TournamentHub) ต้อง scroll ซ้อนกันเอง */}
        <Box
          sx={(theme) => ({
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            ...scrollbarStyles(theme),
          })}
        >
          <Outlet />
        </Box>
      </div>
    </div>
  );
}
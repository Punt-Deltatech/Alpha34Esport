import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

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
            Get Started Now!
          </h2>

          <p style={{ fontSize: '14px', color: '#949ba4', margin: '0 0 24px 0', lineHeight: '1.5' }}>
            Manage your teams, join tournaments, and track your performance — all from one place.
          </p>

          <button
            onClick={() => navigate('/myteam')}
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
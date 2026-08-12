import { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Avatar,
  Chip,
  IconButton,
} from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import PhoneIcon from '@mui/icons-material/Phone';
import ChatIcon from '@mui/icons-material/Chat';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Member, Team } from '../Types/Team_types';
import { PersonalFormDialog, type PersonalForm } from './Form/PersonalForm';
import EditTeamForm from './Form/EditTeamForm';
import AddMemberForm from './Form/AddMemberForm';
import ConfirmDialog from '../../components/ConfirmDialog';

interface MyTeam {
  team: Team;
  currentUserId: string; // need to know who "self" is within the team, for permission checks
  onDisband: () => void;
  onUpdateMember: (memberId: string, data: PersonalForm) => void;
  onUpdateTeam: (updates: Pick<Team, 'name' | 'game' | 'description' | 'maxMembers' | 'social' | 'logo'>) => void;
  onRemoveMember: (memberId: string) => void; // captain removes a member from the team
}

export default function MyTeam({
  team,
  currentUserId,
  onDisband,
  onUpdateMember,
  onUpdateTeam,
  onRemoveMember,
}: MyTeam) {
  // Store both the member being edited and the permission (isSelf) explicitly, rather than relying on an id comparison that might not match
  const [editingTarget, setEditingTarget] = useState<{ member: Member; isSelf: boolean } | null>(null);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [removingMember, setRemovingMember] = useState<Member | null>(null); // member about to be removed (awaiting confirm)

  const isRosterFull = team.members.length >= (team.maxMembers ?? 5);

  const currentUserMember =
    team.members.find((m) => m.userid === currentUserId) ??
    team.members.find((m) => m.isOwner) ??
    team.members[0];
  const isCaptain = !!currentUserMember?.isOwner;

  // Always opens "self's" form, regardless of whether currentUserId matches the id exactly
  const handleOpenSelfForm = () => {
    if (currentUserMember) setEditingTarget({ member: currentUserMember, isSelf: true });
  };
  // Captain opens another member's form only to set their Role (not their own)
  const handleOpenRoleForm = (member: Member) => setEditingTarget({ member, isSelf: false });
  const handleCloseForm = () => setEditingTarget(null);

  // Captain removes a member from the team — always opens the confirm dialog first
  const handleConfirmRemove = () => {
    if (removingMember) onRemoveMember(removingMember.userid);
    setRemovingMember(null);
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: 'auto', width: '100%' }}>
      {/* Header Profile */}
      <Card
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          p: 3,
          mb: 3,
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
            <Avatar
              src={team.logo || undefined}
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'rgba(255,255,255,0.08)',
                color: 'primary.main',
                fontWeight: 700,
                borderRadius: 2,
              }}
            >
              {team.name.charAt(0)}
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {team.name}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setIsEditingTeam(true)}
                  sx={{ color: 'text.secondary' }}
                  aria-label="Edit team"
                >
                  <EditIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, display: 'block', mb: 1.5 }}>
                {team.game}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: team.social ? 1 : 2 }}>
                {team.description || 'No description provided.'}
              </Typography>
              {team.social && (
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  🔗 {team.social}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            {/* Tournament application submission has moved to the Tournament Hub page (apply directly via the Join button on that tournament) */}
            <Button variant="outlined" color="error" size="small" onClick={onDisband} sx={{ textTransform: 'none' }}>
              Disband Team
            </Button>
          </Box>
        </Box>
      </Card>

      {/* Roster Section */}
      <Card sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Roster
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {team.members.length}/{team.maxMembers ?? 5} players
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {currentUserMember && (
              <Button
                variant="outlined"
                onClick={handleOpenSelfForm}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Edit Profile
              </Button>
            )}
            {isCaptain && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setIsAddingMember(true)}
                disabled={isRosterFull}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                + Add
              </Button>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {team.members.map((member) => {
            const isSelf = currentUserMember?.userid === member.userid;
            // position is always enforced: the team creator (isOwner) = Captain, everyone else = Member
            const position: PersonalForm['position'] = member.isOwner ? 'Captain' : 'Member';

            return (
              <Box
                key={member.userid}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  bgcolor: 'rgba(255,255,255,0.02)',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    src={member.avatar || undefined}
                    sx={{ width: 40, height: 40, bgcolor: 'primary.main', color: '#fff', fontWeight: 700 }}
                  >
                    {member.name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {member.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      {member.role} · {position}
                    </Typography>
                    {(member.gameUID || member.phone || member.socialContact) && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
                        {member.gameUID && (
                          <Chip
                            icon={<BadgeIcon sx={{ fontSize: 16 }} />}
                            label={member.gameUID}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              borderColor: 'primary.main',
                              color: 'primary.main',
                              '& .MuiChip-icon': { color: 'primary.main' },
                            }}
                          />
                        )}
                        {member.phone && (
                          <Chip
                            icon={<PhoneIcon sx={{ fontSize: 16 }} />}
                            label={member.phone}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              borderColor: 'success.main',
                              color: 'success.main',
                              '& .MuiChip-icon': { color: 'success.main' },
                            }}
                          />
                        )}
                        {member.socialContact && (
                          <Chip
                            icon={<ChatIcon sx={{ fontSize: 16 }} />}
                            label={member.socialContact}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              borderColor: 'info.main',
                              color: 'info.main',
                              '& .MuiChip-icon': { color: 'info.main' },
                            }}
                          />
                        )}
                      </Box>
                    )}
                    {member.portfolio && (
                      <Typography
                        component="a"
                        href={member.portfolio.fileData}
                        download={member.portfolio.fileName}
                        variant="caption"
                        sx={{ color: 'primary.main', display: 'block', mt: 0.25, textDecoration: 'none' }}
                      >
                        📎 {member.portfolio.fileName}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {member.isOwner && (
                    <Chip
                      label="Team Owner"
                      size="small"
                      sx={{
                        bgcolor: 'rgba(88, 101, 242, 0.15)',
                        color: 'primary.main',
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: 'primary.main',
                      }}
                    />
                  )}

                  {/* Only the captain can set the Role (starter/Substitute) for other members */}
                  {isCaptain && !isSelf && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleOpenRoleForm(member)}
                      sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                      Role
                    </Button>
                  )}

                  {/* Only the captain can remove members — cannot remove themselves or the Owner */}
                  {isCaptain && !isSelf && !member.isOwner && (
                    <IconButton
                      size="small"
                      onClick={() => setRemovingMember(member)}
                      aria-label={`Remove ${member.name}`}
                      sx={{
                        color: 'error.main',
                        border: '1px solid',
                        borderColor: 'error.main',
                        borderRadius: 2,
                        '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.08)' },
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Card>

      {isAddingMember && (
        <AddMemberForm
          teamName={team.name}
          existingMembers={team.members}
          onClose={() => setIsAddingMember(false)}
        />
      )}

      {isEditingTeam && (
        <EditTeamForm
          team={team}
          onClose={() => setIsEditingTeam(false)}
          onSave={(updates) => {
            onUpdateTeam(updates);
            setIsEditingTeam(false);
          }}
        />
      )}

      {editingTarget && (
        <PersonalFormDialog
          member={editingTarget.member}
          isSelf={editingTarget.isSelf}
          isCaptain={isCaptain}
          onClose={handleCloseForm}
          onSubmit={(data) => {
            onUpdateMember(editingTarget.member.userid, data);
            handleCloseForm();
          }}
        />
      )}

      {removingMember && (
        <ConfirmDialog
          title="Remove Member"
          description={`Are you sure you want to remove "${removingMember.name}" from the team? This action cannot be undone.`}
          confirmLabel="Remove Member"
          onConfirm={handleConfirmRemove}
          onClose={() => setRemovingMember(null)}
        />
      )}
    </Box>
  );
}
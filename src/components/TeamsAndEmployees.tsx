import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  Shield, 
  Phone, 
  Mail, 
  Camera, 
  Video, 
  Award, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Edit, 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  Briefcase,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import { Employee, Team, EmployeeRole } from '../types';
import { dbEmployees, dbTeams } from '../services/dbService';
import { useToast } from './Toast';

interface TeamsAndEmployeesProps {
  employees: Employee[];
  teams: Team[];
}

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  photographer: 'Photographer',
  cinematographer: 'Cinematographer',
  drone_operator: 'Drone Operator',
  video_editor: 'Video Editor',
  photo_editor: 'Photo Editor',
  album_designer: 'Album Designer',
  printing_operator: 'Printing Operator',
  driver: 'Driver',
  helper: 'Helper',
};

export const ROLE_COLORS: Record<EmployeeRole, string> = {
  photographer: 'bg-blue-50 text-blue-700 border-blue-200',
  cinematographer: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  drone_operator: 'bg-purple-50 text-purple-700 border-purple-200',
  video_editor: 'bg-pink-50 text-pink-700 border-pink-200',
  photo_editor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  album_designer: 'bg-amber-50 text-amber-700 border-amber-200',
  printing_operator: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  driver: 'bg-slate-100 text-slate-700 border-slate-200',
  helper: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function TeamsAndEmployees({ employees, teams }: TeamsAndEmployeesProps) {
  const { showSuccess, showError } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'teams' | 'employees'>('teams');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Employee Modal State
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empRole, setEmpRole] = useState<EmployeeRole>('photographer');
  const [empSkills, setEmpSkills] = useState('');
  const [empExperience, setEmpExperience] = useState('2 Years');
  const [empSalary, setEmpSalary] = useState<number>(25000);
  const [empStatus, setEmpStatus] = useState<'available' | 'busy' | 'leave'>('available');
  const [empTeamId, setEmpTeamId] = useState('');
  const [empPhotoUrl, setEmpPhotoUrl] = useState('');
  const [empSubmitting, setEmpSubmitting] = useState(false);

  // Team Modal State
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamLeaderId, setTeamLeaderId] = useState('');
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [teamMobile, setTeamMobile] = useState('');
  const [teamStatus, setTeamStatus] = useState<'active' | 'inactive'>('active');
  const [teamAvailability, setTeamAvailability] = useState<'available' | 'busy'>('available');
  const [teamSubmitting, setTeamSubmitting] = useState(false);

  // Default suggested team names
  const suggestedTeams = ['Team Alpha', 'Team Bravo', 'Team Wedding', 'Team Outdoor', 'Team Video', 'Team Premium'];

  // Handle Employee Form Open
  const handleOpenEmpModal = (emp?: Employee) => {
    if (emp) {
      setEditingEmp(emp);
      setEmpName(emp.name);
      setEmpPhone(emp.phone);
      setEmpEmail(emp.email || '');
      setEmpRole(emp.role);
      setEmpSkills(emp.skills ? emp.skills.join(', ') : '');
      setEmpExperience(emp.experience || '2 Years');
      setEmpSalary(emp.salary || 25000);
      setEmpStatus(emp.status);
      setEmpTeamId(emp.assignedTeamId || '');
      setEmpPhotoUrl(emp.photoUrl || '');
    } else {
      setEditingEmp(null);
      setEmpName('');
      setEmpPhone('');
      setEmpEmail('');
      setEmpRole('photographer');
      setEmpSkills('Portrait Shooting, Lighting setup');
      setEmpExperience('3 Years');
      setEmpSalary(30000);
      setEmpStatus('available');
      setEmpTeamId('');
      setEmpPhotoUrl('');
    }
    setIsEmpModalOpen(true);
  };

  // Submit Employee
  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empPhone.trim()) {
      showError('Please enter Employee Name and Phone number.');
      return;
    }
    setEmpSubmitting(true);
    const parsedSkills = empSkills.split(',').map(s => s.trim()).filter(Boolean);
    const assignedTeam = teams.find(t => t.id === empTeamId);

    try {
      if (editingEmp) {
        await dbEmployees.update(editingEmp.id, {
          name: empName.trim(),
          phone: empPhone.trim(),
          email: empEmail.trim() || undefined,
          role: empRole,
          skills: parsedSkills,
          experience: empExperience.trim(),
          salary: Number(empSalary) || 0,
          status: empStatus,
          assignedTeamId: empTeamId || undefined,
          assignedTeamName: assignedTeam ? assignedTeam.name : undefined,
          photoUrl: empPhotoUrl.trim() || undefined,
        });
        showSuccess(`Updated profile for ${empName.trim()}`);
      } else {
        await dbEmployees.add({
          name: empName.trim(),
          phone: empPhone.trim(),
          email: empEmail.trim() || undefined,
          role: empRole,
          skills: parsedSkills,
          experience: empExperience.trim(),
          salary: Number(empSalary) || 0,
          status: empStatus,
          assignedTeamId: empTeamId || undefined,
          assignedTeamName: assignedTeam ? assignedTeam.name : undefined,
          photoUrl: empPhotoUrl.trim() || undefined,
        });
        showSuccess(`Added new employee ${empName.trim()}`);
      }
      setIsEmpModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Failed to save employee profile.');
    } finally {
      setEmpSubmitting(false);
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (emp: Employee) => {
    if (confirm(`Are you sure you want to delete employee ${emp.name}?`)) {
      try {
        await dbEmployees.delete(emp.id);
        showSuccess(`Deleted employee ${emp.name}`);
      } catch (err: any) {
        showError('Failed to delete employee.');
      }
    }
  };

  // Handle Team Form Open
  const handleOpenTeamModal = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setTeamName(team.name);
      setTeamLeaderId(team.leaderId || '');
      setTeamMemberIds(team.memberIds || []);
      setTeamMobile(team.mobileNumber || '');
      setTeamStatus(team.status || 'active');
      setTeamAvailability(team.availability || 'available');
    } else {
      setEditingTeam(null);
      setTeamName('');
      setTeamLeaderId('');
      setTeamMemberIds([]);
      setTeamMobile('');
      setTeamStatus('active');
      setTeamAvailability('available');
    }
    setIsTeamModalOpen(true);
  };

  // Submit Team
  const handleSubmitTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      showError('Please enter a Team Name.');
      return;
    }
    setTeamSubmitting(true);
    const leader = employees.find(e => e.id === teamLeaderId);
    const memberNames = employees
      .filter(e => teamMemberIds.includes(e.id))
      .map(e => e.name);

    try {
      if (editingTeam) {
        await dbTeams.update(editingTeam.id, {
          name: teamName.trim(),
          leaderId: teamLeaderId,
          leaderName: leader ? leader.name : undefined,
          memberIds: teamMemberIds,
          memberNames,
          mobileNumber: teamMobile.trim(),
          status: teamStatus,
          availability: teamAvailability,
        });
        showSuccess(`Updated ${teamName.trim()}`);
      } else {
        await dbTeams.add({
          name: teamName.trim(),
          leaderId: teamLeaderId,
          leaderName: leader ? leader.name : undefined,
          memberIds: teamMemberIds,
          memberNames,
          mobileNumber: teamMobile.trim(),
          status: teamStatus,
          availability: teamAvailability,
        });
        showSuccess(`Created new team ${teamName.trim()}`);
      }
      setIsTeamModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Failed to save team.');
    } finally {
      setTeamSubmitting(false);
    }
  };

  // Delete Team
  const handleDeleteTeam = async (team: Team) => {
    if (confirm(`Are you sure you want to delete team ${team.name}?`)) {
      try {
        await dbTeams.delete(team.id);
        showSuccess(`Deleted team ${team.name}`);
      } catch (err: any) {
        showError('Failed to delete team.');
      }
    }
  };

  // Filtering employees
  const filteredEmployees = employees.filter(emp => {
    const matchesQuery = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone.includes(searchQuery) ||
      (emp.skills && emp.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    return matchesQuery && matchesRole && matchesStatus;
  });

  // Filtering teams
  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.leaderName && t.leaderName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 font-bold">
              <Users className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
              Team & Staff Operations
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Manage photography teams, crew roles, skills, availability & salaries.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {activeSubTab === 'teams' ? (
            <button
              onClick={() => handleOpenTeamModal()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-blue-500/20"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Create New Team
            </button>
          ) : (
            <button
              onClick={() => handleOpenEmpModal()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-blue-500/20"
            >
              <UserPlus className="h-4 w-4 stroke-[3]" />
              Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs Selector */}
      <div className="flex items-center gap-2 bg-slate-200/60 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveSubTab('teams')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'teams'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          Teams Directory ({teams.length})
        </button>
        <button
          onClick={() => setActiveSubTab('employees')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'employees'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          Staff Roster ({employees.length})
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeSubTab === 'teams' ? "Search team name or leader..." : "Search employee by name, phone, or skill..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {activeSubTab === 'employees' && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Crew Roles</option>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Availability</option>
              <option value="available">Available</option>
              <option value="busy">Busy / On Event</option>
              <option value="leave">On Leave</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: TEAMS MANAGEMENT */}
      {activeSubTab === 'teams' && (
        <div className="space-y-4">
          {filteredTeams.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No teams created yet</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                Create dedicated event teams (e.g., Team Alpha, Team Wedding, Team Video) and assign team leaders & operators.
              </p>
              <button
                onClick={() => handleOpenTeamModal()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 hover:bg-blue-700 transition"
              >
                <Plus className="h-4 w-4" />
                Add First Team
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTeams.map((team) => {
                const leader = employees.find(e => e.id === team.leaderId);
                const memberList = employees.filter(e => team.memberIds?.includes(e.id));

                return (
                  <div
                    key={team.id}
                    className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Team Badge */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            Photography Team
                          </span>
                          <h3 className="text-lg font-black text-slate-900 mt-1 font-display">
                            {team.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            team.availability === 'available'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {team.availability === 'available' ? 'Available' : 'Busy on Assignment'}
                          </span>
                        </div>
                      </div>

                      {/* Team Leader */}
                      <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          Team Leader
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                            {(leader?.name || team.leaderName || 'TL').charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {leader?.name || team.leaderName || 'Unassigned Leader'}
                            </p>
                            {leader?.phone && (
                              <p className="text-[10px] text-slate-500 font-mono">
                                📞 {leader.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Members */}
                      <div className="mt-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Team Members ({memberList.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {memberList.length > 0 ? (
                            memberList.map(m => (
                              <span
                                key={m.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-lg"
                              >
                                {m.name} ({ROLE_LABELS[m.role] || m.role})
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">No member assigned</span>
                          )}
                        </div>
                      </div>

                      {/* Contact Mobile */}
                      {team.mobileNumber && (
                        <div className="mt-3 text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>Direct Mobile: <strong>{team.mobileNumber}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        team.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {team.status === 'active' ? 'Active Team' : 'Inactive'}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenTeamModal(team)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Team"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Team"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EMPLOYEES ROSTER */}
      {activeSubTab === 'employees' && (
        <div className="space-y-4">
          {filteredEmployees.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No employees found</h3>
              <p className="text-slate-500 text-xs mt-1">Add photographers, cinematographers, drone pilots & editors.</p>
              <button
                onClick={() => handleOpenEmpModal()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 hover:bg-blue-700 transition"
              >
                <UserPlus className="h-4 w-4" />
                Add Employee
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                >
                  <div>
                    {/* Header profile info */}
                    <div className="flex items-start gap-3">
                      {emp.photoUrl ? (
                        <img
                          src={emp.photoUrl}
                          alt={emp.name}
                          referrerPolicy="no-referrer"
                          className="h-12 w-12 rounded-2xl object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-extrabold text-base flex items-center justify-center shadow-sm">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="text-base font-bold text-slate-900 truncate font-display">
                            {emp.name}
                          </h3>
                          <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${ROLE_COLORS[emp.role] || 'bg-slate-100'}`}>
                            {ROLE_LABELS[emp.role] || emp.role}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {emp.phone}
                          </span>
                          {emp.experience && (
                            <span className="flex items-center gap-1 font-semibold text-slate-600">
                              <Award className="h-3 w-3 text-amber-500" />
                              {emp.experience}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Assigned Team */}
                    {emp.assignedTeamName && (
                      <div className="mt-3 px-3 py-1.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-blue-500" />
                        <span>Team: <strong>{emp.assignedTeamName}</strong></span>
                      </div>
                    )}

                    {/* Skills */}
                    {emp.skills && emp.skills.length > 0 && (
                      <div className="mt-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Skills & Equipment
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {emp.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-md"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Salary & Status */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Monthly Salary</span>
                        <span className="font-extrabold text-slate-800">
                          ₹{(emp.salary || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg border ${
                        emp.status === 'available'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : emp.status === 'busy'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {emp.status === 'available' ? 'Available' : emp.status === 'busy' ? 'Busy on Event' : 'On Leave'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex justify-end gap-2 border-t border-slate-50">
                    <button
                      onClick={() => handleOpenEmpModal(emp)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit Profile"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Profile"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      <AnimatePresence>
        {isEmpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900 font-display">
                  {editingEmp ? 'Edit Employee Profile' : 'Add New Employee'}
                </h3>
                <button
                  onClick={() => setIsEmpModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitEmployee} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Kumar"
                      value={empName}
                      onChange={(e) => setEmpName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9876543210"
                      value={empPhone}
                      onChange={(e) => setEmpPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Role *</label>
                    <select
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value as EmployeeRole)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                    >
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Experience</label>
                    <input
                      type="text"
                      placeholder="e.g. 4 Years"
                      value={empExperience}
                      onChange={(e) => setEmpExperience(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Salary (₹)</label>
                    <input
                      type="number"
                      placeholder="25000"
                      value={empSalary}
                      onChange={(e) => setEmpSalary(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                    <select
                      value={empStatus}
                      onChange={(e) => setEmpStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                    >
                      <option value="available">Available</option>
                      <option value="busy">Busy / On Event</option>
                      <option value="leave">On Leave</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Team</label>
                  <select
                    value={empTeamId}
                    onChange={(e) => setEmpTeamId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="">No Team Assigned</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Skills (comma separated)</label>
                  <input
                    type="text"
                    placeholder="Portrait Photography, Drone 4K, Premiere Pro"
                    value={empSkills}
                    onChange={(e) => setEmpSkills(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Photo Image URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={empPhotoUrl}
                    onChange={(e) => setEmpPhotoUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEmpModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={empSubmitting}
                    className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
                  >
                    {empSubmitting ? 'Saving...' : editingEmp ? 'Update Profile' : 'Save Employee'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT TEAM MODAL */}
      <AnimatePresence>
        {isTeamModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900 font-display">
                  {editingTeam ? 'Edit Team Configuration' : 'Create New Event Team'}
                </h3>
                <button
                  onClick={() => setIsTeamModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitTeam} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Team Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Team Alpha or Team Wedding"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                  />
                  {/* Quick suggestions */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {suggestedTeams.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setTeamName(sug)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-[10px] font-medium rounded-md transition"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Team Leader</label>
                  <select
                    value={teamLeaderId}
                    onChange={(e) => setTeamLeaderId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Employee as Team Leader</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({ROLE_LABELS[emp.role]})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Team Mobile Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={teamMobile}
                    onChange={(e) => setTeamMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Team Members</label>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1.5">
                    {employees.length === 0 ? (
                      <p className="text-slate-400 text-xs p-2">No employees available. Add employees first.</p>
                    ) : (
                      employees.map((emp) => {
                        const isChecked = teamMemberIds.includes(emp.id);
                        return (
                          <label
                            key={emp.id}
                            className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium cursor-pointer transition ${
                              isChecked ? 'bg-blue-50 text-blue-800' : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTeamMemberIds([...teamMemberIds, emp.id]);
                                } else {
                                  setTeamMemberIds(teamMemberIds.filter(id => id !== emp.id));
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{emp.name} ({ROLE_LABELS[emp.role] || emp.role})</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                    <select
                      value={teamStatus}
                      onChange={(e) => setTeamStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Availability</label>
                    <select
                      value={teamAvailability}
                      onChange={(e) => setTeamAvailability(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                    >
                      <option value="available">Available</option>
                      <option value="busy">Busy</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsTeamModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={teamSubmitting}
                    className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
                  >
                    {teamSubmitting ? 'Saving...' : editingTeam ? 'Update Team' : 'Create Team'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

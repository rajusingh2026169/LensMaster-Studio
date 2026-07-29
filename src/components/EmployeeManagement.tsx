import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Calendar, 
  Clock, 
  DollarSign, 
  Briefcase, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Award, 
  TrendingUp, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Camera, 
  Check, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Sparkles,
  ArrowUpRight,
  PieChart
} from 'lucide-react';
import { 
  Employee, 
  AttendanceRecord, 
  SalaryRecord, 
  LeaveRequest, 
  EmployeeJobAssignment,
  EmployeeRole,
  Booking,
  WorkOrder
} from '../types';
import { dbEmployees, dbAttendance, dbPayroll, dbLeaves, dbEmployeeJobs } from '../services/dbService';
import { useToast } from './Toast';

interface EmployeeManagementProps {
  employees: Employee[];
  bookings?: Booking[];
  workOrders?: WorkOrder[];
  userRole?: string;
}

export const DEPARTMENTS = [
  'Photographer',
  'Designer',
  'Printer Operator',
  'Office Staff'
];

export const DESIGNATIONS = [
  'Senior Photographer',
  'Junior Photographer',
  'Graphic Designer',
  'Printing Operator',
  'Receptionist',
  'Office Assistant',
  'Manager',
  'Accountant'
];

export const EMPLOYMENT_TYPES = [
  'Full Time',
  'Part Time',
  'Freelance'
];

export const LEAVE_TYPES = [
  'Casual Leave',
  'Sick Leave',
  'Paid Leave',
  'Emergency Leave'
] as const;

export default function EmployeeManagement({ 
  employees, 
  bookings = [], 
  workOrders = [], 
  userRole = 'owner' 
}: EmployeeManagementProps) {
  const { showSuccess, showError } = useToast();
  
  // Permission checks
  const isAdmin = userRole === 'owner' || userRole === 'admin' || userRole === 'super_admin';

  // Sub-tab Navigation
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'list' | 'add_employee' | 'attendance' | 'salary' | 'leave' | 'jobs' | 'performance'
  >('dashboard');

  // Real-time Firestore state
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [jobAssignments, setJobAssignments] = useState<EmployeeJobAssignment[]>([]);

  // Selected Date for Attendance
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Selected Month for Payroll
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // Search & Filters for List
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Employee for View Profile / Edit
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Salary Slip Modal
  const [selectedSalarySlip, setSelectedSalarySlip] = useState<SalaryRecord | null>(null);

  // Attendance Form Modal / Inline State
  const [markingAttendance, setMarkingAttendance] = useState<Record<string, {
    status: 'Present' | 'Absent' | 'Late' | 'On Leave' | 'Half Day';
    checkInTime: string;
    checkOutTime: string;
    notes: string;
  }>>({});

  // Leave Request Modal
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [newLeaveEmployeeId, setNewLeaveEmployeeId] = useState('');
  const [newLeaveType, setNewLeaveType] = useState<LeaveRequest['leaveType']>('Casual Leave');
  const [newLeaveStartDate, setNewLeaveStartDate] = useState('');
  const [newLeaveEndDate, setNewLeaveEndDate] = useState('');
  const [newLeaveReason, setNewLeaveReason] = useState('');

  // Job Assignment Modal
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [newJobEmployeeId, setNewJobEmployeeId] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobCategory, setNewJobCategory] = useState<EmployeeJobAssignment['category']>('Photography Booking');
  const [newJobDueDate, setNewJobDueDate] = useState('');
  const [newJobPriority, setNewJobPriority] = useState<EmployeeJobAssignment['priority']>('Medium');
  const [newJobNotes, setNewJobNotes] = useState('');

  // Form Fields State (for Add / Edit Employee)
  const initialFormState = {
    employeeCustomId: '',
    name: '',
    fatherName: '',
    dob: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    photoUrl: '',
    phone: '',
    altPhone: '',
    email: '',
    address: '',
    aadhaarNumber: '',
    panNumber: '',
    department: 'Photographer',
    designation: 'Senior Photographer',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: 25000,
    employmentType: 'Full Time',
    shift: 'General (9 AM - 6 PM)',
    workingHours: '9 Hours',
    employeeStatus: 'Active' as 'Active' | 'Inactive',
    role: 'photographer' as EmployeeRole
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isSavingEmp, setIsSavingEmp] = useState(false);

  // Subscribe to Attendance, Payroll, Leaves, Jobs
  useEffect(() => {
    let unsub1: (() => void) | null = null;
    let unsub2: (() => void) | null = null;
    let unsub3: (() => void) | null = null;
    let unsub4: (() => void) | null = null;

    try {
      unsub1 = dbAttendance.subscribe((records) => setAttendanceRecords(records));
      unsub2 = dbPayroll.subscribe((records) => setSalaryRecords(records));
      unsub3 = dbLeaves.subscribe((requests) => setLeaveRequests(requests));
      unsub4 = dbEmployeeJobs.subscribe((jobs) => setJobAssignments(jobs));
    } catch (err) {
      console.error("Error subscribing to Employee sub-collections:", err);
    }

    return () => {
      if (unsub1) unsub1();
      if (unsub2) unsub2();
      if (unsub3) unsub3();
      if (unsub4) unsub4();
    };
  }, []);

  // Generate Auto Employee ID e.g., EMP-101
  const generateAutoEmpId = () => {
    const nextNum = employees.length + 101;
    return `EMP-${nextNum}`;
  };

  // Populate Add / Edit Employee Form
  useEffect(() => {
    if (editingEmployee) {
      setFormData({
        employeeCustomId: editingEmployee.employeeCustomId || generateAutoEmpId(),
        name: editingEmployee.name || '',
        fatherName: editingEmployee.fatherName || '',
        dob: editingEmployee.dob || '',
        gender: editingEmployee.gender || 'Male',
        photoUrl: editingEmployee.photoUrl || '',
        phone: editingEmployee.phone || '',
        altPhone: editingEmployee.altPhone || '',
        email: editingEmployee.email || '',
        address: editingEmployee.address || '',
        aadhaarNumber: editingEmployee.aadhaarNumber || '',
        panNumber: editingEmployee.panNumber || '',
        department: editingEmployee.department || 'Photographer',
        designation: editingEmployee.designation || 'Senior Photographer',
        joiningDate: editingEmployee.joiningDate || new Date().toISOString().split('T')[0],
        salary: editingEmployee.salary || 25000,
        employmentType: editingEmployee.employmentType || 'Full Time',
        shift: editingEmployee.shift || 'General (9 AM - 6 PM)',
        workingHours: editingEmployee.workingHours || '9 Hours',
        employeeStatus: editingEmployee.employeeStatus || 'Active',
        role: editingEmployee.role || 'photographer'
      });
    } else {
      setFormData({
        ...initialFormState,
        employeeCustomId: generateAutoEmpId()
      });
    }
  }, [editingEmployee, employees.length]);

  // Sync Daily Attendance marking table for selected date
  useEffect(() => {
    const todayRecordsMap: Record<string, any> = {};
    employees.forEach(emp => {
      const existing = attendanceRecords.find(
        r => r.employeeId === emp.id && r.date === attendanceDate
      );
      todayRecordsMap[emp.id] = {
        status: existing?.status || 'Present',
        checkInTime: existing?.checkInTime || '09:30 AM',
        checkOutTime: existing?.checkOutTime || '06:30 PM',
        notes: existing?.notes || ''
      };
    });
    setMarkingAttendance(todayRecordsMap);
  }, [attendanceDate, employees, attendanceRecords]);

  // Calculated Dashboard Stats
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => (e.employeeStatus || 'Active') === 'Active').length;
    
    // Attendance today
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAttendance = attendanceRecords.filter(r => r.date === todayStr);
    const presentToday = todayAttendance.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const absentToday = todayAttendance.filter(r => r.status === 'Absent').length;

    // Assigned & Pending Jobs
    const todayAssignedJobs = jobAssignments.filter(j => j.assignedDate === todayStr || j.status === 'Working').length;
    const pendingJobsCount = jobAssignments.filter(j => j.status === 'Pending').length;

    // Salary Due
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const monthPayrolls = salaryRecords.filter(s => s.month === currentMonthStr);
    const salaryPaid = monthPayrolls.reduce((sum, s) => sum + (s.paymentStatus === 'Paid' ? s.netSalary : 0), 0);
    const totalExpectedSalary = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
    const salaryDue = Math.max(0, totalExpectedSalary - salaryPaid);

    return {
      total,
      active,
      presentToday,
      absentToday,
      todayAssignedJobs,
      pendingJobsCount,
      salaryDue
    };
  }, [employees, attendanceRecords, jobAssignments, salaryRecords]);

  // Filtered Employee List
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const customId = (emp.employeeCustomId || '').toLowerCase();
      const name = (emp.name || '').toLowerCase();
      const phone = (emp.phone || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = name.includes(query) || phone.includes(query) || customId.includes(query) || dept.includes(query);
      
      const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || (emp.employeeStatus || 'Active') === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, searchQuery, departmentFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(start, start + itemsPerPage);
  }, [filteredEmployees, currentPage]);

  // Handle Form Submit (Add / Update Employee)
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showError("Access Denied: Only Admin or Super Admin can manage employee profiles.");
      return;
    }

    if (!formData.name.trim() || !formData.phone.trim()) {
      showError("Please fill in required fields (Full Name and Mobile Number).");
      return;
    }

    setIsSavingEmp(true);
    try {
      if (editingEmployee) {
        await dbEmployees.update(editingEmployee.id, {
          employeeCustomId: formData.employeeCustomId,
          name: formData.name,
          fatherName: formData.fatherName,
          dob: formData.dob,
          gender: formData.gender,
          photoUrl: formData.photoUrl,
          phone: formData.phone,
          altPhone: formData.altPhone,
          email: formData.email,
          address: formData.address,
          aadhaarNumber: formData.aadhaarNumber,
          panNumber: formData.panNumber,
          department: formData.department,
          designation: formData.designation,
          joiningDate: formData.joiningDate,
          salary: Number(formData.salary) || 0,
          employmentType: formData.employmentType,
          shift: formData.shift,
          workingHours: formData.workingHours,
          employeeStatus: formData.employeeStatus,
          role: formData.role
        });
        showSuccess(`Employee record for ${formData.name} updated successfully.`);
        setEditingEmployee(null);
      } else {
        await dbEmployees.add({
          employeeCustomId: formData.employeeCustomId || generateAutoEmpId(),
          name: formData.name,
          fatherName: formData.fatherName,
          dob: formData.dob,
          gender: formData.gender,
          photoUrl: formData.photoUrl,
          phone: formData.phone,
          altPhone: formData.altPhone,
          email: formData.email,
          address: formData.address,
          aadhaarNumber: formData.aadhaarNumber,
          panNumber: formData.panNumber,
          department: formData.department,
          designation: formData.designation,
          joiningDate: formData.joiningDate,
          salary: Number(formData.salary) || 0,
          employmentType: formData.employmentType,
          shift: formData.shift,
          workingHours: formData.workingHours,
          employeeStatus: formData.employeeStatus,
          skills: ['Photography', 'Editing'],
          experience: '2 Years',
          role: formData.role,
          status: 'available'
        });
        showSuccess(`New employee ${formData.name} added successfully.`);
      }
      setActiveTab('list');
    } catch (err: any) {
      console.error("Error saving employee:", err);
      showError(`Failed to save employee: ${err.message || 'Error occurred'}`);
    } finally {
      setIsSavingEmp(false);
    }
  };

  // Handle Delete Employee
  const handleDeleteEmployee = async (emp: Employee) => {
    if (!isAdmin) {
      showError("Access Denied: Only Admin can delete employee records.");
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete employee ${emp.name} (${emp.employeeCustomId || emp.id})?`)) {
      try {
        await dbEmployees.delete(emp.id);
        showSuccess(`Employee ${emp.name} deleted.`);
      } catch (err: any) {
        showError(`Failed to delete employee: ${err.message}`);
      }
    }
  };

  // Save Bulk Attendance for selected date
  const handleSaveAttendance = async () => {
    try {
      for (const emp of employees) {
        const item = markingAttendance[emp.id];
        if (item) {
          await dbAttendance.addOrUpdate({
            employeeId: emp.id,
            employeeName: emp.name,
            date: attendanceDate,
            status: item.status,
            checkInTime: item.checkInTime,
            checkOutTime: item.checkOutTime,
            workingHours: 9,
            notes: item.notes
          });
        }
      }
      showSuccess(`Attendance for ${attendanceDate} saved successfully in Firestore.`);
    } catch (err: any) {
      showError(`Failed to save attendance: ${err.message}`);
    }
  };

  // Generate Bulk Monthly Payroll Records
  const handleGeneratePayroll = async () => {
    if (!isAdmin) {
      showError("Access Denied: Admin privileges required.");
      return;
    }

    try {
      let count = 0;
      for (const emp of employees) {
        // Check if salary record already exists for this month
        const exists = salaryRecords.some(r => r.employeeId === emp.id && r.month === selectedMonth);
        if (!exists) {
          const basic = emp.salary || 25000;
          await dbPayroll.add({
            employeeId: emp.id,
            employeeName: emp.name,
            department: emp.department || 'Photographer',
            designation: emp.designation || 'Staff',
            month: selectedMonth,
            basicSalary: basic,
            bonus: 0,
            incentive: 0,
            deduction: 0,
            advanceSalary: 0,
            netSalary: basic,
            paymentStatus: 'Pending',
            notes: `Auto-generated payroll slip for ${selectedMonth}`
          });
          count++;
        }
      }
      if (count > 0) {
        showSuccess(`Generated ${count} monthly payroll records for ${selectedMonth}.`);
      } else {
        showSuccess(`Payroll records for ${selectedMonth} are already up-to-date.`);
      }
    } catch (err: any) {
      showError(`Failed to generate payroll: ${err.message}`);
    }
  };

  // Mark Payroll as Paid
  const handleMarkSalaryPaid = async (recordId: string) => {
    if (!isAdmin) {
      showError("Access Denied: Only Admin can update salary payment status.");
      return;
    }
    try {
      await dbPayroll.update(recordId, {
        paymentStatus: 'Paid',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer / UPI'
      });
      showSuccess("Salary marked as Paid.");
    } catch (err: any) {
      showError(`Failed to update payment status: ${err.message}`);
    }
  };

  // Handle Create Leave Request
  const handleCreateLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeaveEmployeeId || !newLeaveStartDate || !newLeaveEndDate) {
      showError("Please fill in all leave request fields.");
      return;
    }

    const emp = employees.find(e => e.id === newLeaveEmployeeId);
    if (!emp) return;

    // Calc total days
    const start = new Date(newLeaveStartDate);
    const end = new Date(newLeaveEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    try {
      await dbLeaves.add({
        employeeId: emp.id,
        employeeName: emp.name,
        leaveType: newLeaveType,
        startDate: newLeaveStartDate,
        endDate: newLeaveEndDate,
        totalDays: totalDays || 1,
        reason: newLeaveReason || 'Personal Leave',
        status: 'Pending',
        appliedOn: new Date().toISOString().split('T')[0]
      });
      showSuccess("Leave request submitted successfully.");
      setIsLeaveModalOpen(false);
      setNewLeaveReason('');
    } catch (err: any) {
      showError(`Failed to submit leave request: ${err.message}`);
    }
  };

  // Handle Approve/Reject Leave
  const handleLeaveStatusUpdate = async (leaveId: string, status: 'Approved' | 'Rejected') => {
    if (!isAdmin) {
      showError("Access Denied: Only Admin can approve or reject leave requests.");
      return;
    }

    try {
      await dbLeaves.update(leaveId, {
        status,
        approvedBy: 'Admin'
      });
      showSuccess(`Leave request ${status.toLowerCase()} successfully.`);
    } catch (err: any) {
      showError(`Failed to update leave status: ${err.message}`);
    }
  };

  // Handle Create Job Assignment
  const handleCreateJobAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobEmployeeId || !newJobTitle || !newJobDueDate) {
      showError("Please fill in required job details.");
      return;
    }

    const emp = employees.find(e => e.id === newJobEmployeeId);
    if (!emp) return;

    try {
      await dbEmployeeJobs.add({
        employeeId: emp.id,
        employeeName: emp.name,
        title: newJobTitle,
        category: newJobCategory,
        assignedDate: new Date().toISOString().split('T')[0],
        dueDate: newJobDueDate,
        priority: newJobPriority,
        status: 'Pending',
        notes: newJobNotes
      });
      showSuccess(`Job assigned to ${emp.name} successfully.`);
      setIsJobModalOpen(false);
      setNewJobTitle('');
      setNewJobNotes('');
    } catch (err: any) {
      showError(`Failed to assign job: ${err.message}`);
    }
  };

  // Handle Export to CSV
  const handleExportCSV = () => {
    if (filteredEmployees.length === 0) {
      showError("No employee data available to export.");
      return;
    }

    const headers = [
      'Employee ID',
      'Full Name',
      'Mobile Number',
      'Email',
      'Department',
      'Designation',
      'Joining Date',
      'Salary (INR)',
      'Employment Type',
      'Status'
    ];

    const rows = filteredEmployees.map(e => [
      `"${e.employeeCustomId || e.id}"`,
      `"${e.name}"`,
      `"${e.phone}"`,
      `"${e.email || ''}"`,
      `"${e.department || ''}"`,
      `"${e.designation || ''}"`,
      `"${e.joiningDate || ''}"`,
      e.salary || 0,
      `"${e.employmentType || 'Full Time'}"`,
      `"${e.employeeStatus || 'Active'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Employees_List_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Employee list exported to CSV successfully.");
  };

  // Handle Print Employee List
  const handlePrintList = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">
                Employee Management Module
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Comprehensive HR, Attendance, Payroll, Leave & Performance Suite
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <button
              onClick={() => {
                setEditingEmployee(null);
                setActiveTab('add_employee');
              }}
              className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add New Employee</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 transition cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrintList}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 transition cursor-pointer"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>Print List</span>
          </button>
        </div>
      </div>

      {/* Module Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-none">
        {[
          { id: 'dashboard', label: 'Overview', icon: PieChart },
          { id: 'list', label: 'Employee List', icon: Users },
          { id: 'add_employee', label: editingEmployee ? 'Edit Employee' : 'Add Employee', icon: UserPlus },
          { id: 'attendance', label: 'Attendance', icon: Clock },
          { id: 'salary', label: 'Salary & Payroll', icon: DollarSign },
          { id: 'leave', label: 'Leave Requests', icon: Calendar },
          { id: 'jobs', label: 'Job Assignments', icon: Briefcase },
          { id: 'performance', label: 'Performance', icon: TrendingUp },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
              `}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* VIEW 1: DASHBOARD OVERVIEW CARDS */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Employees */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Staff</p>
                <h3 className="text-2xl font-black text-slate-900 font-display">{stats.total}</h3>
                <span className="text-[11px] font-medium text-blue-600 flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5" /> Registered workforce
                </span>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <Users className="h-6 w-6" />
              </div>
            </div>

            {/* Active Employees */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Staff</p>
                <h3 className="text-2xl font-black text-emerald-600 font-display">{stats.active}</h3>
                <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Currently Active
                </span>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <UserCheck className="h-6 w-6" />
              </div>
            </div>

            {/* Present Today */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Present Today</p>
                <h3 className="text-2xl font-black text-blue-700 font-display">{stats.presentToday}</h3>
                <span className="text-[11px] font-medium text-slate-500">
                  {stats.absentToday} Absent Today
                </span>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Clock className="h-6 w-6" />
              </div>
            </div>

            {/* Pending Jobs & Salary Due */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Salary Due</p>
                <h3 className="text-2xl font-black text-amber-600 font-display">
                  ₹{stats.salaryDue.toLocaleString('en-IN')}
                </h3>
                <span className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Month Payroll Status
                </span>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Additional Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-6 rounded-2xl text-white shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-blue-200 uppercase tracking-wider">Today's Assigned Jobs</h3>
                <Briefcase className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-3xl font-black font-display">{stats.todayAssignedJobs}</p>
              <p className="text-xs text-blue-300 mt-2">Shoots, Designings & Printing orders in progress today</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-slate-700">Pending Job Tasks</h3>
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-3xl font-black font-display text-slate-900">{stats.pendingJobsCount}</p>
              <p className="text-xs text-slate-500 mt-2">Unassigned or pending tasks waiting for action</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-slate-700">Pending Leave Approvals</h3>
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-3xl font-black font-display text-slate-900">
                {leaveRequests.filter(l => l.status === 'Pending').length}
              </p>
              <p className="text-xs text-slate-500 mt-2">Leave applications pending admin review</p>
            </div>
          </div>

          {/* Quick Recent Staff Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Active Staff Overview</h3>
              <button
                onClick={() => setActiveTab('list')}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                View Full Directory <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.slice(0, 6).map(emp => (
                <div key={emp.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between hover:border-blue-300 transition">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 border border-blue-200 overflow-hidden">
                      {emp.photoUrl ? (
                        <img src={emp.photoUrl} alt={emp.name} className="h-full w-full object-cover" />
                      ) : (
                        emp.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{emp.name}</h4>
                      <p className="text-[11px] text-slate-500">{emp.designation || emp.role}</p>
                      <span className="inline-block text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 border border-blue-100">
                        {emp.employeeCustomId || 'EMP-101'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingEmployee(emp)}
                    className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition cursor-pointer"
                    title="View Profile"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: EMPLOYEE LIST & DIRECTORY TABLE */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Employee ID, Name, Mobile or Department..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Department */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                <select
                  value={departmentFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Departments</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Filter Status */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="py-3.5 px-4">Employee ID</th>
                  <th className="py-3.5 px-4">Photo</th>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Mobile & Email</th>
                  <th className="py-3.5 px-4">Department & Role</th>
                  <th className="py-3.5 px-4">Joining Date</th>
                  <th className="py-3.5 px-4">Salary</th>
                  <th className="py-3.5 px-4">Today Attendance</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700 font-medium">
                {paginatedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
                      No employee records found. Click "Add New Employee" to create one.
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map(emp => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const attToday = attendanceRecords.find(r => r.employeeId === emp.id && r.date === todayStr);
                    const attStatus = attToday?.status || 'Not Marked';

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-bold text-blue-700">
                          {emp.employeeCustomId || emp.id.substring(0, 7)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="h-9 w-9 rounded-full bg-slate-200 overflow-hidden border border-slate-300 flex items-center justify-center font-bold text-slate-600">
                            {emp.photoUrl ? (
                              <img src={emp.photoUrl} alt={emp.name} className="h-full w-full object-cover" />
                            ) : (
                              emp.name.charAt(0).toUpperCase()
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {emp.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <p className="text-slate-900 font-semibold">{emp.phone}</p>
                            <p className="text-[11px] text-slate-400">{emp.email || '—'}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-semibold text-slate-800">{emp.department || 'Photographer'}</span>
                            <p className="text-[11px] text-slate-500">{emp.designation || emp.role}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {emp.joiningDate || '—'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          ₹{(emp.salary || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            attStatus === 'Present' ? 'bg-emerald-100 text-emerald-800' :
                            attStatus === 'Absent' ? 'bg-rose-100 text-rose-800' :
                            attStatus === 'Late' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {attStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            (emp.employeeStatus || 'Active') === 'Active' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {emp.employeeStatus || 'Active'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingEmployee(emp)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition cursor-pointer"
                              title="View Profile"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingEmployee(emp);
                                    setActiveTab('add_employee');
                                  }}
                                  className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition cursor-pointer"
                                  title="Edit Employee"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEmployee(emp)}
                                  className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition cursor-pointer"
                                  title="Delete Employee"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-800">{paginatedEmployees.length}</span> of <span className="font-bold text-slate-800">{filteredEmployees.length}</span> employees
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: ADD / EDIT EMPLOYEE FORM */}
      {activeTab === 'add_employee' && (
        <form onSubmit={handleSaveEmployee} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {editingEmployee ? `Edit Employee Record (${editingEmployee.employeeCustomId || editingEmployee.id})` : 'Add New Employee'}
              </h2>
              <p className="text-xs text-slate-500">Fill in personal credentials, job specifications, and status</p>
            </div>
            {editingEmployee && (
              <button
                type="button"
                onClick={() => {
                  setEditingEmployee(null);
                  setActiveTab('list');
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {/* Section 1: Personal Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Personal Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Photo URL</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.photoUrl}
                  onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Father's Name</label>
                <input
                  type="text"
                  placeholder="e.g. Suresh Kumar"
                  value={formData.fatherName}
                  onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={e => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate Mobile</label>
                <input
                  type="tel"
                  placeholder="e.g. 9123456789"
                  value={formData.altPhone}
                  onChange={e => setFormData({ ...formData, altPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="employee@studio.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar Number</label>
                <input
                  type="text"
                  placeholder="12-digit Aadhaar Number"
                  value={formData.aadhaarNumber}
                  onChange={e => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number (Optional)</label>
                <input
                  type="text"
                  placeholder="10-digit PAN"
                  value={formData.panNumber}
                  onChange={e => setFormData({ ...formData, panNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="Full address with street, city, pin code"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Job Details */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Job & Role Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID (Auto Generated)</label>
                <input
                  type="text"
                  readOnly
                  value={formData.employeeCustomId}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-blue-700 outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                <select
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Designation *</label>
                <select
                  value={formData.designation}
                  onChange={e => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {DESIGNATIONS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date</label>
                <input
                  type="date"
                  value={formData.joiningDate}
                  onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Salary (INR) *</label>
                <input
                  type="number"
                  min={0}
                  value={formData.salary}
                  onChange={e => setFormData({ ...formData, salary: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
                <select
                  value={formData.employmentType}
                  onChange={e => setFormData({ ...formData, employmentType: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {EMPLOYMENT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shift</label>
                <input
                  type="text"
                  placeholder="e.g. Day Shift (9 AM - 6 PM)"
                  value={formData.shift}
                  onChange={e => setFormData({ ...formData, shift: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Working Hours</label>
                <input
                  type="text"
                  placeholder="e.g. 8 Hours"
                  value={formData.workingHours}
                  onChange={e => setFormData({ ...formData, workingHours: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Status</label>
                <select
                  value={formData.employeeStatus}
                  onChange={e => setFormData({ ...formData, employeeStatus: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setFormData(initialFormState);
                setEditingEmployee(null);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingEmployee(null);
                setActiveTab('list');
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingEmp}
              className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{isSavingEmp ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Save Employee'}</span>
            </button>
          </div>
        </form>
      )}

      {/* VIEW 4: ATTENDANCE MANAGEMENT */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Daily Attendance Marking</h2>
              <p className="text-xs text-slate-500">Record check-in, check-out times, and daily attendance status</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              />
              <button
                onClick={handleSaveAttendance}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Save Attendance</span>
              </button>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Check In Time</th>
                  <th className="py-3 px-4">Check Out Time</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {employees.map(emp => {
                  const currentMark = markingAttendance[emp.id] || {
                    status: 'Present',
                    checkInTime: '09:30 AM',
                    checkOutTime: '06:30 PM',
                    notes: ''
                  };

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {emp.name} ({emp.employeeCustomId || emp.id.substring(0, 5)})
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {emp.department || 'Staff'}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={currentMark.status}
                          onChange={e => setMarkingAttendance({
                            ...markingAttendance,
                            [emp.id]: { ...currentMark, status: e.target.value as any }
                          })}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border outline-none ${
                            currentMark.status === 'Present' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            currentMark.status === 'Absent' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                            currentMark.status === 'Late' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Late">Late Entry</option>
                          <option value="On Leave">On Leave</option>
                          <option value="Half Day">Half Day</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={currentMark.checkInTime}
                          onChange={e => setMarkingAttendance({
                            ...markingAttendance,
                            [emp.id]: { ...currentMark, checkInTime: e.target.value }
                          })}
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none w-28"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={currentMark.checkOutTime}
                          onChange={e => setMarkingAttendance({
                            ...markingAttendance,
                            [emp.id]: { ...currentMark, checkOutTime: e.target.value }
                          })}
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none w-28"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Optional notes"
                          value={currentMark.notes}
                          onChange={e => setMarkingAttendance({
                            ...markingAttendance,
                            [emp.id]: { ...currentMark, notes: e.target.value }
                          })}
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none w-full"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 5: SALARY & PAYROLL MANAGEMENT */}
      {activeTab === 'salary' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Payroll & Monthly Salary Slips</h2>
              <p className="text-xs text-slate-500">Generate, review and print monthly salary slips and track dues</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              />
              {isAdmin && (
                <button
                  onClick={handleGeneratePayroll}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Generate Month Payroll</span>
                </button>
              )}
            </div>
          </div>

          {/* Payroll List */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Month</th>
                  <th className="py-3.5 px-4">Basic Salary</th>
                  <th className="py-3.5 px-4">Bonus / Incentive</th>
                  <th className="py-3.5 px-4">Deductions</th>
                  <th className="py-3.5 px-4">Net Salary</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Salary Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-medium">
                {salaryRecords.filter(s => s.month === selectedMonth).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No payroll records found for {selectedMonth}. Click "Generate Month Payroll" above to create slips.
                    </td>
                  </tr>
                ) : (
                  salaryRecords.filter(s => s.month === selectedMonth).map(sal => (
                    <tr key={sal.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {sal.employeeName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {sal.month}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        ₹{(sal.basicSalary || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-700 font-semibold">
                        +₹{((sal.bonus || 0) + (sal.incentive || 0)).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-rose-700 font-semibold">
                        -₹{((sal.deduction || 0) + (sal.advanceSalary || 0)).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                        ₹{(sal.netSalary || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          sal.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {sal.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {sal.paymentStatus !== 'Paid' && isAdmin && (
                            <button
                              onClick={() => handleMarkSalaryPaid(sal.id)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-200 transition cursor-pointer"
                            >
                              Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedSalarySlip(sal)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Slip</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 6: LEAVE MANAGEMENT */}
      {activeTab === 'leave' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">Leave Applications & Approval</h2>
              <p className="text-xs text-slate-500">Track casual, sick, paid & emergency leave requests</p>
            </div>

            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Request Leave</span>
            </button>
          </div>

          {/* Leave History Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Total Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No leave applications found.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map(leave => (
                    <tr key={leave.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{leave.employeeName}</td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{leave.leaveType}</td>
                      <td className="py-3 px-4 text-slate-600">{leave.startDate} to {leave.endDate}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{leave.totalDays} Days</td>
                      <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">{leave.reason}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                          leave.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {leave.status === 'Pending' && isAdmin ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleLeaveStatusUpdate(leave.id, 'Approved')}
                              className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-700 transition cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleLeaveStatusUpdate(leave.id, 'Rejected')}
                              className="px-2.5 py-1 bg-rose-600 text-white text-[11px] font-bold rounded-lg hover:bg-rose-700 transition cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-semibold">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 7: JOB ASSIGNMENTS */}
      {activeTab === 'jobs' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">Staff Task & Job Assignments</h2>
              <p className="text-xs text-slate-500">Assign photography shoots, designing work, printing or delivery tasks</p>
            </div>

            <button
              onClick={() => setIsJobModalOpen(true)}
              className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Assign New Job</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobAssignments.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400">
                No job assignments recorded. Click "Assign New Job" to assign work to staff.
              </div>
            ) : (
              jobAssignments.map(job => (
                <div key={job.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {job.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      job.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                      job.status === 'Working' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900">{job.title}</h3>
                  <p className="text-xs text-slate-600 font-semibold">Assigned to: <span className="text-blue-700">{job.employeeName}</span></p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                    <span>Due Date: <strong>{job.dueDate}</strong></span>
                    <span className={`font-bold ${job.priority === 'High' ? 'text-rose-600' : 'text-slate-600'}`}>
                      {job.priority} Priority
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 8: PERFORMANCE */}
      {activeTab === 'performance' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold text-slate-900 font-display">Employee Performance Ratings</h2>
            <p className="text-xs text-slate-500">Track order completion rates, client ratings & monthly performance scores</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map(emp => {
              const empJobs = jobAssignments.filter(j => j.employeeId === emp.id);
              const completed = empJobs.filter(j => j.status === 'Completed').length;
              const pending = empJobs.filter(j => j.status === 'Pending' || j.status === 'Working').length;
              const score = empJobs.length > 0 ? Math.round((completed / empJobs.length) * 100) : 95;

              return (
                <div key={emp.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 border border-blue-200 overflow-hidden">
                      {emp.photoUrl ? (
                        <img src={emp.photoUrl} alt={emp.name} className="h-full w-full object-cover" />
                      ) : (
                        emp.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{emp.name}</h3>
                      <p className="text-xs text-slate-500">{emp.designation || emp.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center bg-white p-3 rounded-xl border border-slate-200/60">
                    <div>
                      <span className="text-xs font-bold text-emerald-600">{completed}</span>
                      <p className="text-[10px] text-slate-400 font-medium">Completed</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-600">{pending}</span>
                      <p className="text-[10px] text-slate-400 font-medium">Pending</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-blue-600">{score}%</span>
                      <p className="text-[10px] text-slate-400 font-medium">Score</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW PROFILE MODAL */}
      <AnimatePresence>
        {viewingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-6 my-8"
            >
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-blue-100 text-blue-700 font-black text-2xl flex items-center justify-center border border-blue-200 overflow-hidden shadow-xs">
                    {viewingEmployee.photoUrl ? (
                      <img src={viewingEmployee.photoUrl} alt={viewingEmployee.name} className="h-full w-full object-cover" />
                    ) : (
                      viewingEmployee.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 font-display">{viewingEmployee.name}</h2>
                    <p className="text-xs font-semibold text-blue-600">{viewingEmployee.designation || viewingEmployee.role}</p>
                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded mt-1">
                      ID: {viewingEmployee.employeeCustomId || viewingEmployee.id}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setViewingEmployee(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Profile Tabs Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-2">
                  <h3 className="font-bold text-slate-900 uppercase text-[10px] text-blue-600 tracking-wider">Personal Details</h3>
                  <p><strong>Father's Name:</strong> {viewingEmployee.fatherName || '—'}</p>
                  <p><strong>DOB:</strong> {viewingEmployee.dob || '—'}</p>
                  <p><strong>Gender:</strong> {viewingEmployee.gender || 'Male'}</p>
                  <p><strong>Mobile:</strong> {viewingEmployee.phone}</p>
                  <p><strong>Email:</strong> {viewingEmployee.email || '—'}</p>
                  <p><strong>Aadhaar:</strong> {viewingEmployee.aadhaarNumber || '—'}</p>
                  <p><strong>PAN:</strong> {viewingEmployee.panNumber || '—'}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-2">
                  <h3 className="font-bold text-slate-900 uppercase text-[10px] text-blue-600 tracking-wider">Job Details</h3>
                  <p><strong>Department:</strong> {viewingEmployee.department || 'Photographer'}</p>
                  <p><strong>Joining Date:</strong> {viewingEmployee.joiningDate || '—'}</p>
                  <p><strong>Monthly Salary:</strong> ₹{(viewingEmployee.salary || 0).toLocaleString('en-IN')}</p>
                  <p><strong>Type:</strong> {viewingEmployee.employmentType || 'Full Time'}</p>
                  <p><strong>Shift:</strong> {viewingEmployee.shift || 'General'}</p>
                  <p><strong>Status:</strong> {viewingEmployee.employeeStatus || 'Active'}</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setViewingEmployee(null)}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SALARY SLIP MODAL */}
      <AnimatePresence>
        {selectedSalarySlip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-8 space-y-6 print:p-0 print:shadow-none"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 font-display">Salary Slip</h2>
                  <p className="text-xs text-slate-500">Month: {selectedSalarySlip.month}</p>
                </div>
                <button
                  onClick={() => setSelectedSalarySlip(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer print:hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Salary Breakdown Details */}
              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                  <p><strong>Employee Name:</strong> {selectedSalarySlip.employeeName}</p>
                  <p><strong>Department:</strong> {selectedSalarySlip.department || 'Photographer'}</p>
                  <p><strong>Status:</strong> <span className="font-bold text-emerald-700">{selectedSalarySlip.paymentStatus}</span></p>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex justify-between p-3 bg-slate-50 border-b font-bold">
                    <span>Component</span>
                    <span>Amount (INR)</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex justify-between">
                      <span>Basic Salary</span>
                      <span className="font-semibold">₹{selectedSalarySlip.basicSalary.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Bonus & Incentives</span>
                      <span className="font-semibold">+₹{((selectedSalarySlip.bonus || 0) + (selectedSalarySlip.incentive || 0)).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-rose-700">
                      <span>Deductions / Advance</span>
                      <span className="font-semibold">-₹{((selectedSalarySlip.deduction || 0) + (selectedSalarySlip.advanceSalary || 0)).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-sm text-slate-900">
                      <span>Net Payable Amount</span>
                      <span>₹{selectedSalarySlip.netSalary.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Salary Slip</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE LEAVE REQUEST MODAL */}
      <AnimatePresence>
        {isLeaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900 text-base">New Leave Request</h3>
                <button onClick={() => setIsLeaveModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleCreateLeaveRequest} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Select Employee</label>
                  <select
                    required
                    value={newLeaveEmployeeId}
                    onChange={e => setNewLeaveEmployeeId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  >
                    <option value="">Select Staff...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.employeeCustomId || e.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Leave Type</label>
                  <select
                    value={newLeaveType}
                    onChange={e => setNewLeaveType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  >
                    {LEAVE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={newLeaveStartDate}
                      onChange={e => setNewLeaveStartDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={newLeaveEndDate}
                      onChange={e => setNewLeaveEndDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Reason</label>
                  <textarea
                    rows={2}
                    placeholder="Specify reason for leave"
                    value={newLeaveReason}
                    onChange={e => setNewLeaveReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLeaveModalOpen(false)}
                    className="px-4 py-2 border rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl"
                  >
                    Submit Leave
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ASSIGN JOB MODAL */}
      <AnimatePresence>
        {isJobModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900 text-base">Assign Job to Staff</h3>
                <button onClick={() => setIsJobModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleCreateJobAssignment} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Select Employee</label>
                  <select
                    required
                    value={newJobEmployeeId}
                    onChange={e => setNewJobEmployeeId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  >
                    <option value="">Select Staff...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.department || e.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Job Category</label>
                  <select
                    value={newJobCategory}
                    onChange={e => setNewJobCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  >
                    <option value="Photography Booking">Photography Booking</option>
                    <option value="Printing Order">Printing Order</option>
                    <option value="Designing Work">Designing Work</option>
                    <option value="Delivery Work">Delivery Work</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Job Title / Task Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wedding Album Photo Editing or Shoot"
                    value={newJobTitle}
                    onChange={e => setNewJobTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Due Date</label>
                    <input
                      type="date"
                      required
                      value={newJobDueDate}
                      onChange={e => setNewJobDueDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Priority</label>
                    <select
                      value={newJobPriority}
                      onChange={e => setNewJobPriority(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 border rounded-xl"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsJobModalOpen(false)}
                    className="px-4 py-2 border rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl"
                  >
                    Assign Task
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

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Calendar, 
  Camera, 
  Printer, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  FileText, 
  Trash2, 
  Edit, 
  X,
  User,
  Filter,
  Users,
  Video,
  Sparkles,
  AlertTriangle,
  MapPin,
  Send,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  Customer, 
  Booking, 
  JobType, 
  BookingStatus, 
  Employee, 
  Team, 
  CustomerRequirements, 
  TeamAssignment 
} from '../types';
import { dbBookings, dbAssignments } from '../services/dbService';
import { useToast } from './Toast';
import OrderTrackingModal from './OrderTrackingModal';

interface BookingsProps {
  bookings: Booking[];
  customers: Customer[];
  employees?: Employee[];
  teams?: Team[];
  preselectedCustomer: Customer | null;
  clearPreselectedCustomer: () => void;
  onGenerateInvoice: (booking: Booking) => void;
}

const EVENT_TYPES = [
  'Wedding',
  'Pre-Wedding',
  'Birthday Party',
  'Corporate Event',
  'Anniversary',
  'Baby Shower / Naming Ceremony',
  'Maternity Shoot',
  'Product / Fashion Shoot',
  'Industrial Flex Printing',
  'Other'
];

export default function Bookings({
  bookings,
  customers,
  employees = [],
  teams = [],
  preselectedCustomer,
  clearPreselectedCustomer,
  onGenerateInvoice,
}: BookingsProps) {
  const { showSuccess, showError } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJobType, setFilterJobType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(preselectedCustomer !== null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  // Tracking Modal Target
  const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null);

  // Modal Tab
  const [modalTab, setModalTab] = useState<'basic' | 'requirements' | 'assignment'>('basic');

  // Core Form State
  const [customerId, setCustomerId] = useState(preselectedCustomer?.id || '');
  const [jobType, setJobType] = useState<JobType>('studio_shoot');
  const [subType, setSubType] = useState('');
  const [description, setDescription] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
  const [status, setStatus] = useState<BookingStatus>('pending');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Customer Requirement Form State
  const [eventType, setEventType] = useState('Wedding');
  const [eventTime, setEventTime] = useState('10:00 AM');
  const [venue, setVenue] = useState('');
  const [numberOfDays, setNumberOfDays] = useState(1);
  const [numberOfCameras, setNumberOfCameras] = useState(2);
  const [droneRequired, setDroneRequired] = useState(false);
  const [ledWallRequired, setLedWallRequired] = useState(false);
  const [craneRequired, setCraneRequired] = useState(false);
  const [liveStreamingRequired, setLiveStreamingRequired] = useState(false);
  const [photoEditingRequired, setPhotoEditingRequired] = useState(true);
  const [albumDesignRequired, setAlbumDesignRequired] = useState(true);
  const [albumPrintingRequired, setAlbumPrintingRequired] = useState(true);
  const [videoEditingRequired, setVideoEditingRequired] = useState(true);
  const [highlightReelRequired, setHighlightReelRequired] = useState(true);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Team & Staff Assignment Form State
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [assignedLeaderId, setAssignedLeaderId] = useState('');
  const [assignedPhotographerIds, setAssignedPhotographerIds] = useState<string[]>([]);
  const [assignedCinematographerIds, setAssignedCinematographerIds] = useState<string[]>([]);
  const [assignedDroneOperatorId, setAssignedDroneOperatorId] = useState('');
  const [assignedVideoEditorId, setAssignedVideoEditorId] = useState('');
  const [assignedPhotoEditorId, setAssignedPhotoEditorId] = useState('');
  const [assignedAlbumDesignerId, setAssignedAlbumDesignerId] = useState('');
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [assignedHelperId, setAssignedHelperId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Balance due calculation helper
  const balanceDue = useMemo(() => {
    return Math.max(0, totalAmount - advancePaid);
  }, [totalAmount, advancePaid]);

  // DOUBLE BOOKING PREVENTION DETECTOR
  // Checks which teams and staff are already booked on the selected `bookingDate`
  const doubleBookingConflicts = useMemo(() => {
    if (!bookingDate) return [];
    const conflicts: string[] = [];

    // Filter existing bookings on same date (excluding current edited booking)
    const sameDateBookings = bookings.filter(
      b => b.bookingDate === bookingDate && b.id !== editingBooking?.id && b.status !== 'cancelled'
    );

    if (sameDateBookings.length === 0) return [];

    // Check Team conflict
    if (selectedTeamId) {
      const busyTeamBooking = sameDateBookings.find(b => b.assignment?.teamId === selectedTeamId);
      if (busyTeamBooking) {
        const teamObj = teams.find(t => t.id === selectedTeamId);
        conflicts.push(`Team "${teamObj?.name || 'Selected Team'}" is already booked for "${busyTeamBooking.subType}" on ${bookingDate}.`);
      }
    }

    // Consolidated assigned staff
    const selectedStaffIds = [
      assignedLeaderId,
      ...assignedPhotographerIds,
      ...assignedCinematographerIds,
      assignedDroneOperatorId,
      assignedVideoEditorId,
      assignedPhotoEditorId,
      assignedAlbumDesignerId,
      assignedDriverId,
      assignedHelperId,
    ].filter(Boolean);

    // Check Staff conflicts
    selectedStaffIds.forEach((empId) => {
      const busyBooking = sameDateBookings.find(b => 
        b.assignment?.assignedEmployeeIds?.includes(empId) ||
        b.assignment?.teamLeaderId === empId ||
        b.assignment?.photographerIds?.includes(empId) ||
        b.assignment?.cinematographerIds?.includes(empId) ||
        b.assignment?.droneOperatorId === empId
      );

      if (busyBooking) {
        const emp = employees.find(e => e.id === empId);
        if (emp) {
          conflicts.push(`Employee ${emp.name} (${emp.role}) is already assigned to "${busyBooking.subType}" on ${bookingDate}.`);
        }
      }
    });

    return conflicts;
  }, [
    bookingDate,
    selectedTeamId,
    assignedLeaderId,
    assignedPhotographerIds,
    assignedCinematographerIds,
    assignedDroneOperatorId,
    assignedVideoEditorId,
    assignedPhotoEditorId,
    assignedAlbumDesignerId,
    assignedDriverId,
    assignedHelperId,
    bookings,
    editingBooking,
    employees,
    teams
  ]);

  // Handle open modal for create
  const handleOpenCreate = () => {
    setEditingBooking(null);
    setCustomerId(preselectedCustomer?.id || '');
    setJobType('studio_shoot');
    setSubType('');
    setDescription('');
    setBookingDate(new Date().toISOString().split('T')[0]);
    setDeliveryDate(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
    setStatus('pending');
    setTotalAmount(0);
    setAdvancePaid(0);
    setNotes('');

    // Requirements reset
    setEventType('Wedding');
    setEventTime('10:00 AM');
    setVenue('');
    setNumberOfDays(1);
    setNumberOfCameras(2);
    setDroneRequired(false);
    setLedWallRequired(false);
    setCraneRequired(false);
    setLiveStreamingRequired(false);
    setPhotoEditingRequired(true);
    setAlbumDesignRequired(true);
    setAlbumPrintingRequired(true);
    setVideoEditingRequired(true);
    setHighlightReelRequired(true);
    setSpecialInstructions('');

    // Assignments reset
    setSelectedTeamId('');
    setAssignedLeaderId('');
    setAssignedPhotographerIds([]);
    setAssignedCinematographerIds([]);
    setAssignedDroneOperatorId('');
    setAssignedVideoEditorId('');
    setAssignedPhotoEditorId('');
    setAssignedAlbumDesignerId('');
    setAssignedDriverId('');
    setAssignedHelperId('');

    setModalTab('basic');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Handle open modal for edit
  const handleOpenEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setCustomerId(booking.customerId);
    setJobType(booking.jobType);
    setSubType(booking.subType);
    setDescription(booking.description || '');
    setBookingDate(booking.bookingDate);
    setDeliveryDate(booking.deliveryDate);
    setStatus(booking.status);
    setTotalAmount(booking.totalAmount);
    setAdvancePaid(booking.advancePaid);
    setNotes(booking.notes || '');

    // Requirements preload
    const req = booking.requirements;
    if (req) {
      setEventType(req.eventType || 'Wedding');
      setEventTime(req.eventTime || '10:00 AM');
      setVenue(req.venue || '');
      setNumberOfDays(req.numberOfDays || 1);
      setNumberOfCameras(req.numberOfCameras || 2);
      setDroneRequired(!!req.droneRequired);
      setLedWallRequired(!!req.ledWallRequired);
      setCraneRequired(!!req.craneRequired);
      setLiveStreamingRequired(!!req.liveStreamingRequired);
      setPhotoEditingRequired(!!req.photoEditingRequired);
      setAlbumDesignRequired(!!req.albumDesignRequired);
      setAlbumPrintingRequired(!!req.albumPrintingRequired);
      setVideoEditingRequired(!!req.videoEditingRequired);
      setHighlightReelRequired(!!req.highlightReelRequired);
      setSpecialInstructions(req.specialInstructions || '');
    }

    // Assignments preload
    const asgn = booking.assignment;
    if (asgn) {
      setSelectedTeamId(asgn.teamId || '');
      setAssignedLeaderId(asgn.teamLeaderId || '');
      setAssignedPhotographerIds(asgn.photographerIds || []);
      setAssignedCinematographerIds(asgn.cinematographerIds || []);
      setAssignedDroneOperatorId(asgn.droneOperatorId || '');
      setAssignedVideoEditorId(asgn.videoEditorId || '');
      setAssignedPhotoEditorId(asgn.photoEditorId || '');
      setAssignedAlbumDesignerId(asgn.albumDesignerId || '');
      setAssignedDriverId(asgn.driverId || '');
      setAssignedHelperId(asgn.helperId || '');
    }

    setModalTab('basic');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Submit Booking Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!customerId) {
      setErrorMsg('Please select a customer.');
      return;
    }
    if (!subType.trim()) {
      setErrorMsg('Please enter a job title or event subtype.');
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      setErrorMsg('Selected customer is invalid.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    // Prepare Requirements Payload
    const requirementsObj: CustomerRequirements = {
      eventType,
      eventDate: bookingDate,
      eventTime,
      venue: venue.trim(),
      numberOfDays: Number(numberOfDays) || 1,
      numberOfCameras: Number(numberOfCameras) || 1,
      droneRequired,
      ledWallRequired,
      craneRequired,
      liveStreamingRequired,
      photoEditingRequired,
      albumDesignRequired,
      albumPrintingRequired,
      videoEditingRequired,
      highlightReelRequired,
      requiredDeliveryDate: deliveryDate,
      specialInstructions: specialInstructions.trim() || undefined,
    };

    // Prepare Team Assignment Payload
    const teamObj = teams.find(t => t.id === selectedTeamId);
    const leaderObj = employees.find(e => e.id === assignedLeaderId);
    const photoObjs = employees.filter(e => assignedPhotographerIds.includes(e.id));
    const cineObjs = employees.filter(e => assignedCinematographerIds.includes(e.id));
    const droneObj = employees.find(e => e.id === assignedDroneOperatorId);
    const vEditObj = employees.find(e => e.id === assignedVideoEditorId);
    const pEditObj = employees.find(e => e.id === assignedPhotoEditorId);
    const albumObj = employees.find(e => e.id === assignedAlbumDesignerId);
    const driverObj = employees.find(e => e.id === assignedDriverId);
    const helperObj = employees.find(e => e.id === assignedHelperId);

    const allAssignedEmpIds = Array.from(new Set([
      assignedLeaderId,
      ...assignedPhotographerIds,
      ...assignedCinematographerIds,
      assignedDroneOperatorId,
      assignedVideoEditorId,
      assignedPhotoEditorId,
      assignedAlbumDesignerId,
      assignedDriverId,
      assignedHelperId
    ].filter(Boolean)));

    const assignmentObj: TeamAssignment = {
      teamId: selectedTeamId || undefined,
      teamName: teamObj ? teamObj.name : undefined,
      teamLeaderId: assignedLeaderId || undefined,
      teamLeaderName: leaderObj ? leaderObj.name : undefined,
      photographerIds: assignedPhotographerIds,
      photographerNames: photoObjs.map(p => p.name),
      cinematographerIds: assignedCinematographerIds,
      cinematographerNames: cineObjs.map(c => c.name),
      droneOperatorId: assignedDroneOperatorId || undefined,
      droneOperatorName: droneObj ? droneObj.name : undefined,
      videoEditorId: assignedVideoEditorId || undefined,
      videoEditorName: vEditObj ? vEditObj.name : undefined,
      photoEditorId: assignedPhotoEditorId || undefined,
      photoEditorName: pEditObj ? pEditObj.name : undefined,
      albumDesignerId: assignedAlbumDesignerId || undefined,
      albumDesignerName: albumObj ? albumObj.name : undefined,
      driverId: assignedDriverId || undefined,
      driverName: driverObj ? driverObj.name : undefined,
      helperId: assignedHelperId || undefined,
      helperName: helperObj ? helperObj.name : undefined,
      assignedEmployeeIds: allAssignedEmpIds
    };

    try {
      let savedBookingId = '';
      if (editingBooking) {
        savedBookingId = editingBooking.id;
        await dbBookings.update(editingBooking.id, {
          customerId,
          customerName: customer.name,
          customerPhone: customer.phone,
          jobType,
          subType: subType.trim(),
          description: description.trim() || '',
          bookingDate,
          deliveryDate,
          status,
          totalAmount,
          advancePaid,
          balanceDue,
          notes: notes.trim() || '',
          requirements: requirementsObj,
          assignment: assignmentObj,
        });
        showSuccess(`Updated order "${subType.trim()}"`);
      } else {
        savedBookingId = await dbBookings.add({
          customerId,
          customerName: customer.name,
          customerPhone: customer.phone,
          jobType,
          subType: subType.trim(),
          description: description.trim() || '',
          bookingDate,
          deliveryDate,
          status,
          totalAmount,
          advancePaid,
          balanceDue,
          notes: notes.trim() || '',
          requirements: requirementsObj,
          assignment: assignmentObj,
        });
        showSuccess(`Created order "${subType.trim()}"`);
      }

      // Sync to assignments subcollection
      if (savedBookingId) {
        await dbAssignments.setAssignment(savedBookingId, {
          ...assignmentObj,
          bookingDate
        });
      }

      setIsModalOpen(false);
      clearPreselectedCustomer();
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || 'Failed to save order.';
      setErrorMsg(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete booking
  const handleDelete = async (id: string) => {
    if (isDeleting) return;
    const targetBooking = bookings.find(b => b.id === id);
    const label = targetBooking ? `order "${targetBooking.subType}"` : 'this order';

    if (confirm(`Are you sure you want to delete ${label}?`)) {
      setIsDeleting(id);
      try {
        await dbBookings.delete(id);
        await dbAssignments.deleteAssignment(id);
        showSuccess(`Deleted ${label}`);
      } catch (error: any) {
        showError('Failed to delete order.');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  // Filtered Bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerPhone.includes(searchQuery) ||
      b.subType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesJobType = filterJobType === 'all' || b.jobType === filterJobType;
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;

    return matchesSearch && matchesJobType && matchesStatus;
  });

  const getStatusBadge = (s: BookingStatus) => {
    switch (s) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'delivered': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'designing': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'printing': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 font-bold">
              <Camera className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
              Orders & Event Bookings
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Define customer requirements, assign photography teams & track production.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-blue-500/20"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          New Order / Booking
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search bookings by customer name, phone, or event type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterJobType}
            onChange={(e) => setFilterJobType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Units</option>
            <option value="studio_shoot">Photo Studio</option>
            <option value="printing_press">Printing Press</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="designing">Designing</option>
            <option value="printing">Printing</option>
            <option value="completed">Completed</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No orders found</h3>
          <p className="text-slate-500 text-xs mt-1">Create an order or adjust your search filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBookings.map((b) => (
            <motion.div
              layout
              key={b.id}
              className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition flex flex-col md:flex-row justify-between gap-4"
            >
              {/* Info Left */}
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${getStatusBadge(b.status)}`}>
                    {b.status}
                  </span>

                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {b.jobType === 'studio_shoot' ? '📷 Photo Studio' : '🖨️ Printing Press'}
                  </span>

                  {b.assignment?.teamName && (
                    <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                      Team: {b.assignment.teamName}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 font-display">
                    {b.subType}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Customer: <strong className="text-slate-800">{b.customerName}</strong> ({b.customerPhone})
                  </p>
                </div>

                {/* Event Requirements Badges */}
                {b.requirements && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-semibold text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded">📍 {b.requirements.venue || 'No Venue'}</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded">🎥 {b.requirements.numberOfCameras || 1} Cameras</span>
                    {b.requirements.droneRequired && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">🛸 Drone</span>}
                    {b.requirements.albumPrintingRequired && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold">📖 Album</span>}
                  </div>
                )}
              </div>

              {/* Dates & Payment Right */}
              <div className="flex flex-wrap items-center md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="text-xs space-y-1">
                  <p className="text-slate-500">Event Date: <strong className="text-slate-800">{b.bookingDate}</strong></p>
                  <p className="text-slate-500">Delivery Date: <strong className="text-blue-600">{b.deliveryDate}</strong></p>
                </div>

                <div className="text-xs space-y-1 text-right">
                  <p className="text-sm font-black text-slate-900">₹{b.totalAmount.toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-emerald-600 font-bold">Paid: ₹{b.advancePaid}</p>
                  {b.balanceDue > 0 ? (
                    <p className="text-[11px] text-rose-600 font-bold">Due: ₹{b.balanceDue}</p>
                  ) : (
                    <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Cleared</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTrackingBooking(b)}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5"
                    title="Track Order Progress"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    Track
                  </button>

                  <button
                    onClick={() => onGenerateInvoice(b)}
                    className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
                    title="Generate Invoice"
                  >
                    <FileText className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(b)}
                    className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                    title="Edit Order"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition"
                    title="Delete Order"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT ORDER MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 space-y-5"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900 font-display">
                  {editingBooking ? 'Edit Booking Order' : 'Create Customer Booking Order'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Double Booking Warning Alert */}
              {doubleBookingConflicts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-800 font-extrabold">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Double Booking Conflict Warning!</span>
                  </div>
                  <ul className="list-disc pl-5 text-amber-700 space-y-0.5 font-medium">
                    {doubleBookingConflicts.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Modal Tab Headers */}
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setModalTab('basic')}
                  className={`flex-1 py-2 rounded-xl transition ${
                    modalTab === 'basic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  1. Basic Details & Pricing
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('requirements')}
                  className={`flex-1 py-2 rounded-xl transition ${
                    modalTab === 'requirements' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  2. Customer Requirements
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('assignment')}
                  className={`flex-1 py-2 rounded-xl transition ${
                    modalTab === 'assignment' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  3. Team & Staff Assignment
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
                    {errorMsg}
                  </div>
                )}

                {/* TAB 1: BASIC DETAILS */}
                {modalTab === 'basic' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Select Customer *</label>
                      <select
                        required
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-- Choose Client Profile --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.phone})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Business Unit *</label>
                        <select
                          value={jobType}
                          onChange={(e) => setJobType(e.target.value as JobType)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                        >
                          <option value="studio_shoot">Photo Studio Shoot</option>
                          <option value="printing_press">Printing Press</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Event Subtype / Job Title *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Royal Wedding Shoot or Flex Printing 20x10"
                          value={subType}
                          onChange={(e) => setSubType(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Event Date *</label>
                        <input
                          type="date"
                          required
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Target Date *</label>
                        <input
                          type="date"
                          required
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Total Amount (₹) *</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={totalAmount}
                          onChange={(e) => setTotalAmount(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Advance Received (₹)</label>
                        <input
                          type="number"
                          min={0}
                          value={advancePaid}
                          onChange={(e) => setAdvancePaid(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as BookingStatus)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="designing">Designing</option>
                          <option value="printing">Printing</option>
                          <option value="completed">Completed</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Description</label>
                      <textarea
                        rows={2}
                        placeholder="Additional internal notes..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: CUSTOMER REQUIREMENTS */}
                {modalTab === 'requirements' && (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Event Type</label>
                        <select
                          value={eventType}
                          onChange={(e) => setEventType(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                        >
                          {EVENT_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Event Time</label>
                        <input
                          type="text"
                          placeholder="e.g. 10:00 AM"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Venue Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Hotel Grand Resort, Civil Lines"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Number of Days</label>
                        <input
                          type="number"
                          min={1}
                          value={numberOfDays}
                          onChange={(e) => setNumberOfDays(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Cameras Required</label>
                        <input
                          type="number"
                          min={1}
                          value={numberOfCameras}
                          onChange={(e) => setNumberOfCameras(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                        />
                      </div>
                    </div>

                    {/* Requirements Toggles */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                        Equipment & Deliverable Requirements
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-semibold text-slate-700">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={droneRequired} onChange={(e) => setDroneRequired(e.target.checked)} className="rounded text-blue-600" />
                          <span>🛸 Drone Needed</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={ledWallRequired} onChange={(e) => setLedWallRequired(e.target.checked)} className="rounded text-blue-600" />
                          <span>📺 LED Wall</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={craneRequired} onChange={(e) => setCraneRequired(e.target.checked)} className="rounded text-blue-600" />
                          <span>🏗️ Crane Needed</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={liveStreamingRequired} onChange={(e) => setLiveStreamingRequired(e.target.checked)} className="rounded text-blue-600" />
                          <span>📡 Live Stream</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={photoEditingRequired} onChange={(e) => setPhotoEditingRequired(e.target.checked)} className="rounded text-blue-600" />
                          <span>🎨 Photo Editing</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={albumDesignRequired} onChange={(e) => setAlbumDesignRequired(e.target.checked)} className="rounded text-blue-600" />
                          <span>📐 Album Design</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={albumPrintingRequired} onChange={(e) => setAlbumPrintingRequired(e.target.checked)} className="rounded text-blue-600" />
                          <span>📖 Album Print</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={videoEditingRequired} onChange={(e) => setVideoEditingRequired(e.target.checked)} className="rounded text-blue-600" />
                          <span>🎬 Video Editing</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={highlightReelRequired} onChange={(e) => setHighlightReelRequired(e.target.checked)} className="rounded text-blue-600" />
                          <span>✨ Highlight Reel</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Special Client Instructions</label>
                      <textarea
                        rows={2}
                        placeholder="Client requested vintage cinematic tone..."
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: TEAM & STAFF ASSIGNMENT */}
                {modalTab === 'assignment' && (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Assign Team</label>
                      <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                      >
                        <option value="">-- Select Team --</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.availability})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Team Leader</label>
                        <select
                          value={assignedLeaderId}
                          onChange={(e) => setAssignedLeaderId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                        >
                          <option value="">Select Team Leader</option>
                          {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Drone Pilot</label>
                        <select
                          value={assignedDroneOperatorId}
                          onChange={(e) => setAssignedDroneOperatorId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                        >
                          <option value="">Select Drone Operator</option>
                          {employees.filter(e => e.role === 'drone_operator' || e.role === 'photographer').map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Photographers</label>
                      <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1">
                        {employees.filter(e => e.role === 'photographer').map(emp => {
                          const isChecked = assignedPhotographerIds.includes(emp.id);
                          return (
                            <label key={emp.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) setAssignedPhotographerIds([...assignedPhotographerIds, emp.id]);
                                  else setAssignedPhotographerIds(assignedPhotographerIds.filter(id => id !== emp.id));
                                }}
                                className="rounded text-blue-600"
                              />
                              <span>{emp.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Cinematographers</label>
                      <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1">
                        {employees.filter(e => e.role === 'cinematographer').map(emp => {
                          const isChecked = assignedCinematographerIds.includes(emp.id);
                          return (
                            <label key={emp.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) setAssignedCinematographerIds([...assignedCinematographerIds, emp.id]);
                                  else setAssignedCinematographerIds(assignedCinematographerIds.filter(id => id !== emp.id));
                                }}
                                className="rounded text-blue-600"
                              />
                              <span>{emp.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Video Editor</label>
                        <select
                          value={assignedVideoEditorId}
                          onChange={(e) => setAssignedVideoEditorId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                        >
                          <option value="">Select Video Editor</option>
                          {employees.filter(e => e.role === 'video_editor').map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Album Designer</label>
                        <select
                          value={assignedAlbumDesignerId}
                          onChange={(e) => setAssignedAlbumDesignerId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                        >
                          <option value="">Select Album Designer</option>
                          {employees.filter(e => e.role === 'album_designer' || e.role === 'photo_editor').map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  {modalTab !== 'basic' ? (
                    <button
                      type="button"
                      onClick={() => setModalTab(modalTab === 'assignment' ? 'requirements' : 'basic')}
                      className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                    >
                      ← Back
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    {modalTab !== 'assignment' ? (
                      <button
                        type="button"
                        onClick={() => setModalTab(modalTab === 'basic' ? 'requirements' : 'assignment')}
                        className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl"
                      >
                        Next Step →
                      </button>
                    ) : null}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
                    >
                      {isSubmitting ? 'Saving Order...' : editingBooking ? 'Update Order' : 'Save Order'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ORDER TRACKING MODAL */}
      {trackingBooking && (
        <OrderTrackingModal
          booking={trackingBooking}
          onClose={() => setTrackingBooking(null)}
        />
      )}
    </div>
  );
}

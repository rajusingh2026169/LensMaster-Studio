import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  CheckCircle, 
  Clock, 
  Camera, 
  Video, 
  Printer, 
  Send, 
  Users, 
  UserCheck, 
  MapPin, 
  Calendar, 
  Sparkles,
  Phone
} from 'lucide-react';
import { Booking, OrderProgress, ProgressStatus } from '../types';
import { dbBookings } from '../services/dbService';
import { useToast } from './Toast';

interface OrderTrackingModalProps {
  booking: Booking;
  onClose: () => void;
}

export default function OrderTrackingModal({ booking, onClose }: OrderTrackingModalProps) {
  const { showSuccess, showError } = useToast();
  
  // Local state initialized with booking progress or defaults
  const [eventProgress, setEventProgress] = useState<ProgressStatus>(
    booking.progress?.eventProgress || (booking.status === 'completed' ? 'completed' : 'in_progress')
  );
  const [editingProgress, setEditingProgress] = useState<ProgressStatus>(
    booking.progress?.editingProgress || 'not_started'
  );
  const [printingProgress, setPrintingProgress] = useState<ProgressStatus>(
    booking.progress?.printingProgress || 'not_started'
  );
  const [deliveryStatus, setDeliveryStatus] = useState<'pending' | 'ready' | 'delivered'>(
    booking.progress?.deliveryStatus || (booking.status === 'delivered' ? 'delivered' : 'pending')
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveProgress = async () => {
    setIsSubmitting(true);
    const updatedProgress: OrderProgress = {
      eventProgress,
      editingProgress,
      printingProgress,
      deliveryStatus,
      updatedAt: new Date().toISOString()
    };

    // Determine updated overall status
    let updatedBookingStatus = booking.status;
    if (deliveryStatus === 'delivered') {
      updatedBookingStatus = 'delivered';
    } else if (printingProgress === 'in_progress' || printingProgress === 'completed') {
      updatedBookingStatus = 'printing';
    } else if (editingProgress === 'in_progress' || editingProgress === 'completed') {
      updatedBookingStatus = 'designing';
    }

    try {
      await dbBookings.update(booking.id, {
        progress: updatedProgress,
        status: updatedBookingStatus
      });
      showSuccess(`Updated order tracking progress for "${booking.subType}"`);
      onClose();
    } catch (err: any) {
      showError('Failed to update progress.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const req = booking.requirements;
  const team = booking.assignment;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 space-y-6"
      >
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase rounded-md tracking-wider">
                Order Tracking & Pipeline
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                #{booking.id.slice(0, 8)}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 font-display mt-1">
              {booking.subType}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Customer: <strong>{booking.customerName}</strong> ({booking.customerPhone})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Assigned Team & Staff Summary */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-blue-600" />
              Assigned Team & Staff
            </h3>
            {team?.teamName ? (
              <span className="px-2.5 py-0.5 bg-blue-600 text-white font-extrabold text-[11px] rounded-full">
                {team.teamName}
              </span>
            ) : (
              <span className="text-[11px] text-amber-600 bg-amber-50 font-bold px-2 py-0.5 rounded-md">
                No Team Assigned
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {team?.teamLeaderName && (
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">Team Leader</span>
                <span className="font-bold text-slate-800">{team.teamLeaderName}</span>
              </div>
            )}

            {team?.photographerNames && team.photographerNames.length > 0 && (
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">Photographers</span>
                <span className="font-bold text-slate-800">{team.photographerNames.join(', ')}</span>
              </div>
            )}

            {team?.cinematographerNames && team.cinematographerNames.length > 0 && (
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">Cinematographers</span>
                <span className="font-bold text-slate-800">{team.cinematographerNames.join(', ')}</span>
              </div>
            )}

            {team?.droneOperatorName && (
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">Drone Pilot</span>
                <span className="font-bold text-slate-800">{team.droneOperatorName}</span>
              </div>
            )}

            {team?.videoEditorName && (
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">Video Editor</span>
                <span className="font-bold text-slate-800">{team.videoEditorName}</span>
              </div>
            )}

            {team?.albumDesignerName && (
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">Album Designer</span>
                <span className="font-bold text-slate-800">{team.albumDesignerName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Requirements Details (if set) */}
        {req && (
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 text-xs space-y-2">
            <h3 className="font-bold text-blue-900 text-xs uppercase tracking-wider">
              Event & Deliverables Specification
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-medium text-slate-700">
              <div>📅 Event Date: <strong>{req.eventDate || booking.bookingDate}</strong></div>
              <div>📍 Venue: <strong>{req.venue || 'N/A'}</strong></div>
              <div>🎥 Cameras: <strong>{req.numberOfCameras || 1}</strong></div>
              <div>🛸 Drone: <strong>{req.droneRequired ? 'Yes' : 'No'}</strong></div>
              <div>🎨 Album Print: <strong>{req.albumPrintingRequired ? 'Yes' : 'No'}</strong></div>
              <div>🎬 Highlight Reel: <strong>{req.highlightReelRequired ? 'Yes' : 'No'}</strong></div>
            </div>
          </div>
        )}

        {/* Interactive Progress Tracking Controls */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Workflow Progress Stages
          </h3>

          <div className="space-y-3">
            {/* Stage 1: Event / Shoot */}
            <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 font-bold">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">1. Event Shoot Execution</h4>
                  <p className="text-[10px] text-slate-500">Live photoshoot & cinematography on site</p>
                </div>
              </div>

              <select
                value={eventProgress}
                onChange={(e) => setEventProgress(e.target.value as ProgressStatus)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Stage 2: Editing & Design */}
            <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 font-bold">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">2. Editing & Album Design</h4>
                  <p className="text-[10px] text-slate-500">Photo selection, color grading & album layout</p>
                </div>
              </div>

              <select
                value={editingProgress}
                onChange={(e) => setEditingProgress(e.target.value as ProgressStatus)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Stage 3: Printing Press */}
            <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 font-bold">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">3. Printing Press Output</h4>
                  <p className="text-[10px] text-slate-500">Album printing, binding & framing press</p>
                </div>
              </div>

              <select
                value={printingProgress}
                onChange={(e) => setPrintingProgress(e.target.value as ProgressStatus)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Stage 4: Customer Delivery */}
            <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 font-bold">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">4. Final Customer Delivery</h4>
                  <p className="text-[10px] text-slate-500">Handover to client & balance collection</p>
                </div>
              </div>

              <select
                value={deliveryStatus}
                onChange={(e) => setDeliveryStatus(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="ready">Ready for Pickup</option>
                <option value="delivered">Delivered to Customer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProgress}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-500/20"
          >
            {isSubmitting ? 'Updating...' : 'Save Tracking Updates'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

import React, { useState } from 'react';
import { 
  Briefcase, 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Printer, 
  Download,
  Image as ImageIcon, 
  Film,
  Edit3,
  HelpCircle,
  X
} from 'lucide-react';
import { WorkOrder } from '../types';
import { dbOrders } from '../services/dbService';
import { printElement, downloadElementAsPDF } from '../utils/printPdfUtils';
import { useToast } from './Toast';

interface WorkOrdersProps {
  orders: WorkOrder[];
}

const STAGES = [
  { key: 'not_started', label: 'Not Started', color: 'bg-slate-200 text-slate-700' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-amber-100 text-amber-800' },
  { key: 'completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-800' },
];

export default function WorkOrders({ orders }: WorkOrdersProps) {
  const { showSuccess, showError } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activePrintOrder, setActivePrintOrder] = useState<WorkOrder | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handlePrintJobCard = (ord: WorkOrder) => {
    setActivePrintOrder(ord);
    setTimeout(() => {
      const success = printElement('printableJobCard', `JobCard-${ord.orderNumber}`);
      if (success) {
        showSuccess(`Printing Job Card #${ord.orderNumber}`);
      } else {
        showError('Failed to launch print dialog.');
      }
    }, 100);
  };

  const handleDownloadJobCardPDF = async (ord: WorkOrder) => {
    if (isExportingPdf) return;
    setActivePrintOrder(ord);
    setIsExportingPdf(true);
    try {
      // Allow react to render printable element
      await new Promise(res => setTimeout(res, 100));
      const success = await downloadElementAsPDF({
        elementId: 'printableJobCard',
        filename: `JobCard-${ord.orderNumber}.pdf`,
      });
      if (success) {
        showSuccess(`Downloaded PDF for Job Card ${ord.orderNumber}`);
      }
    } catch (e: any) {
      showError(e?.message || 'Failed to download Job Card PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const updateStage = async (
    orderId: string,
    field: 'eventProgress' | 'editingProgress' | 'printingProgress' | 'deliveryStatus',
    value: string
  ) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const newProgress = {
      ...targetOrder.progress,
      [field]: value,
      updatedAt: new Date().toISOString(),
    };

    // Calculate overall work order status
    let overallStatus: WorkOrder['status'] = targetOrder.status;
    if (newProgress.deliveryStatus === 'delivered') {
      overallStatus = 'delivered';
    } else if (
      newProgress.eventProgress === 'completed' &&
      newProgress.editingProgress === 'completed' &&
      newProgress.printingProgress === 'completed'
    ) {
      overallStatus = 'completed';
    } else if (newProgress.eventProgress === 'completed') {
      overallStatus = 'in_production';
    }

    try {
      await dbOrders.update(orderId, {
        progress: newProgress,
        status: overallStatus,
      });
    } catch (err: any) {
      alert('Failed to update progress: ' + err.message);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.eventType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
          Production Work Orders
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-0.5">
          Track photography shoot execution, video editing, album printing, and final delivery pipeline.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search work order #, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['all', 'scheduled', 'in_production', 'ready_for_delivery', 'delivered'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition ${
                statusFilter === st ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Work Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center space-y-3">
          <HelpCircle className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No active work orders</h3>
          <p className="text-xs text-slate-400">Work orders are created automatically when quotations are converted.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5"
            >
              {/* Top row */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100">
                    {ord.orderNumber}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {ord.eventType}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 uppercase tracking-wider">
                    {ord.status.replace(/_/g, ' ')}
                  </span>
                  <button
                    onClick={() => handlePrintJobCard(ord)}
                    title="Print Job Card"
                    className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDownloadJobCardPDF(ord)}
                    title="Download Job Card PDF"
                    disabled={isExportingPdf}
                    className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Customer and venue */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">CLIENT</p>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">{ord.customerName}</p>
                  <p className="text-slate-500">{ord.customerPhone}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">EVENT DATE & VENUE</p>
                  <p className="font-extrabold text-slate-900 mt-0.5">{ord.eventDate || 'TBD'}</p>
                  <p className="text-slate-500 truncate">{ord.venue || 'Studio Shoot'}</p>
                </div>
              </div>

              {/* Services List */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">SERVICES INCLUDED:</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ord.items.map((i, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold text-[11px]"
                    >
                      {i.serviceName}
                    </span>
                  ))}
                </div>
              </div>

              {/* Production Pipeline Selectors */}
              <div className="space-y-3 pt-1">
                <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">PRODUCTION STAGES</p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Event Shoot Progress */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <Film className="h-4 w-4 text-blue-600" />
                      <span>Event Coverage</span>
                    </div>
                    <select
                      value={ord.progress.eventProgress}
                      onChange={(e) => updateStage(ord.id, 'eventProgress', e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                    >
                      {STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Video & Photo Editing Progress */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <Edit3 className="h-4 w-4 text-purple-600" />
                      <span>Editing & Grading</span>
                    </div>
                    <select
                      value={ord.progress.editingProgress}
                      onChange={(e) => updateStage(ord.id, 'editingProgress', e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                    >
                      {STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Album Printing Progress */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <Printer className="h-4 w-4 text-amber-600" />
                      <span>Album Printing</span>
                    </div>
                    <select
                      value={ord.progress.printingProgress}
                      onChange={(e) => updateStage(ord.id, 'printingProgress', e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                    >
                      {STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Final Delivery */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <Truck className="h-4 w-4 text-emerald-600" />
                      <span>Final Delivery</span>
                    </div>
                    <select
                      value={ord.progress.deliveryStatus}
                      onChange={(e) => updateStage(ord.id, 'deliveryStatus', e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                    >
                      <option value="pending">Pending</option>
                      <option value="dispatch_ready">Dispatch Ready</option>
                      <option value="delivered">Delivered to Client</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Printable Job Card Template */}
      {activePrintOrder && (
        <div className="hidden print:block fixed left-[-9999px] top-0 print:static print:left-0">
          <div id="printableJobCard" className="bg-white p-8 max-w-[210mm] mx-auto text-slate-800 font-sans space-y-6">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">PRODUCTION WORK ORDER / JOB CARD</h1>
                <p className="text-xs font-bold text-slate-500 mt-1">Order #{activePrintOrder.orderNumber} | {activePrintOrder.eventType}</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-slate-900 text-white font-black text-xs uppercase rounded">
                  Status: {activePrintOrder.status.replace(/_/g, ' ')}
                </span>
                <p className="text-xs text-slate-500 mt-1 font-medium">Printed on: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <p className="font-extrabold text-slate-400 uppercase text-[10px]">CLIENT DETAILS</p>
                <p className="font-black text-slate-900 text-sm mt-1">{activePrintOrder.customerName}</p>
                <p className="text-slate-600 font-semibold">{activePrintOrder.customerPhone}</p>
              </div>
              <div>
                <p className="font-extrabold text-slate-400 uppercase text-[10px]">EVENT DATE & VENUE</p>
                <p className="font-black text-slate-900 text-sm mt-1">{activePrintOrder.eventDate || 'TBD'}</p>
                <p className="text-slate-600 font-semibold">{activePrintOrder.venue || 'Studio Shoot'}</p>
              </div>
            </div>

            <div>
              <p className="font-extrabold text-slate-900 text-xs uppercase mb-2">SERVICES & DELIVERABLES INCLUDED:</p>
              <table className="w-full border-collapse border border-slate-200 text-xs">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-700">
                    <th className="border border-slate-200 p-2 text-left">#</th>
                    <th className="border border-slate-200 p-2 text-left">Service Name</th>
                    <th className="border border-slate-200 p-2 text-center">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {activePrintOrder.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200 font-medium">
                      <td className="border border-slate-200 p-2">{idx + 1}</td>
                      <td className="border border-slate-200 p-2 font-bold text-slate-900">{item.serviceName}</td>
                      <td className="border border-slate-200 p-2 text-center">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <p className="font-extrabold text-slate-900 text-xs uppercase mb-2">PRODUCTION PIPELINE STATUS:</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 border border-slate-200 rounded-lg">
                  <p className="font-bold text-slate-500">Event Coverage:</p>
                  <p className="font-extrabold text-slate-900 capitalize">{activePrintOrder.progress.eventProgress.replace(/_/g, ' ')}</p>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <p className="font-bold text-slate-500">Editing & Grading:</p>
                  <p className="font-extrabold text-slate-900 capitalize">{activePrintOrder.progress.editingProgress.replace(/_/g, ' ')}</p>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <p className="font-bold text-slate-500">Album Printing:</p>
                  <p className="font-extrabold text-slate-900 capitalize">{activePrintOrder.progress.printingProgress.replace(/_/g, ' ')}</p>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <p className="font-bold text-slate-500">Delivery Status:</p>
                  <p className="font-extrabold text-slate-900 capitalize">{activePrintOrder.progress.deliveryStatus.replace(/_/g, ' ')}</p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs pt-12">
              <div>
                <div className="border-b border-slate-400 w-40 h-8"></div>
                <p className="font-bold text-slate-600 mt-1 uppercase text-[10px]">OPERATIONS MANAGER</p>
              </div>
              <div className="text-right">
                <div className="border-b border-slate-400 w-40 h-8 ml-auto"></div>
                <p className="font-bold text-slate-600 mt-1 uppercase text-[10px]">AUTHORIZED SIGNATURE</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

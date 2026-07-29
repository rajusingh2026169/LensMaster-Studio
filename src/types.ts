export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt: string; // ISO String
}

export type JobType = 'studio_shoot' | 'printing_press';

export type BookingStatus = 'pending' | 'designing' | 'printing' | 'completed' | 'delivered' | 'cancelled';

export type EmployeeRole = 
  | 'photographer' 
  | 'cinematographer' 
  | 'drone_operator' 
  | 'video_editor' 
  | 'photo_editor' 
  | 'album_designer' 
  | 'printing_operator' 
  | 'driver' 
  | 'helper';

export interface Employee {
  id: string;
  employeeCustomId?: string; // Auto-generated ID e.g. EMP-101
  name: string;
  fatherName?: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other';
  photoUrl?: string;
  phone: string;
  altPhone?: string;
  email?: string;
  address?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  role: EmployeeRole;
  department?: 'Photographer' | 'Designer' | 'Printer Operator' | 'Office Staff' | string;
  designation?: string;
  joiningDate?: string;
  employmentType?: 'Full Time' | 'Part Time' | 'Freelance' | string;
  shift?: string;
  workingHours?: string;
  skills: string[]; // e.g. ['Portrait', 'Drone', 'Lighting']
  experience: string; // e.g. '5 Years'
  salary: number;
  status: 'available' | 'busy' | 'leave';
  employeeStatus?: 'Active' | 'Inactive';
  assignedTeamId?: string;
  assignedTeamName?: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

export interface Team {
  id: string;
  name: string; // e.g., 'Team Alpha', 'Team Wedding'
  leaderId: string; // Employee ID of leader
  leaderName?: string;
  memberIds: string[]; // Array of Employee IDs
  memberNames?: string[];
  mobileNumber: string;
  status: 'active' | 'inactive';
  availability: 'available' | 'busy';
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

export interface CustomerRequirements {
  eventType: string; // Wedding, Pre-Wedding, Birthday, Party, Corporate, etc.
  eventDate: string; // YYYY-MM-DD
  eventTime: string; // e.g. 10:00 AM
  venue: string;
  numberOfDays: number;
  numberOfCameras: number;
  droneRequired: boolean;
  ledWallRequired: boolean;
  craneRequired: boolean;
  liveStreamingRequired: boolean;
  photoEditingRequired: boolean;
  albumDesignRequired: boolean;
  albumPrintingRequired: boolean;
  videoEditingRequired: boolean;
  highlightReelRequired: boolean;
  requiredDeliveryDate: string; // YYYY-MM-DD
  specialInstructions?: string;
}

export interface TeamAssignment {
  teamId?: string;
  teamName?: string;
  teamLeaderId?: string;
  teamLeaderName?: string;
  photographerIds?: string[];
  photographerNames?: string[];
  cinematographerIds?: string[];
  cinematographerNames?: string[];
  droneOperatorId?: string;
  droneOperatorName?: string;
  videoEditorId?: string;
  videoEditorName?: string;
  photoEditorId?: string;
  photoEditorName?: string;
  albumDesignerId?: string;
  albumDesignerName?: string;
  driverId?: string;
  driverName?: string;
  helperId?: string;
  helperName?: string;
  assignedEmployeeIds?: string[]; // Consolidated array for double-booking checks
}

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface OrderProgress {
  eventProgress: ProgressStatus;
  editingProgress: ProgressStatus;
  printingProgress: ProgressStatus;
  deliveryStatus: 'pending' | 'ready' | 'delivered';
  updatedAt?: string;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  jobType: JobType;
  subType: string; // e.g. Flex Banner, Passport Photo, Wedding Card, Event Video
  description?: string;
  bookingDate: string; // YYYY-MM-DD
  deliveryDate: string; // YYYY-MM-DD
  status: BookingStatus;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  notes?: string;
  // Customer Requirements & Team Assignment extensions
  requirements?: CustomerRequirements;
  assignment?: TeamAssignment;
  progress?: OrderProgress;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

export interface CalendarItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: 'event' | 'employee_leave' | 'team_booking' | 'delivery';
  status: 'available' | 'busy' | 'leave' | 'completed';
  entityId?: string; // bookingId, employeeId, teamId
  entityType?: 'booking' | 'employee' | 'team';
  details?: string;
  createdAt?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  rate: number;
  qty: number;
  total: number;
}

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer';

export interface Invoice {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  invoiceDate: string; // YYYY-MM-DD
  createdAt: string; // ISO String
}

export type ExpenseCategory = 'rent' | 'electricity' | 'materials' | 'labor' | 'misc';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO String
}

export interface InventoryItem {
  id: string;
  itemName: string;
  quantity: number;
  minThreshold: number;
  unit: string; // e.g. rolls, sheets, cartridges, boxes
  rate?: number; // rate or unit cost of the item
  updatedAt: string; // ISO String
}

export type InquirySource = 'walk_in' | 'phone' | 'whatsapp' | 'facebook' | 'instagram' | 'website' | 'reference';
export type InquiryStatus = 'new_inquiry' | 'follow_up' | 'quotation_sent' | 'negotiation' | 'confirmed' | 'cancelled';

export interface Inquiry {
  id: string;
  inquiryNumber: string; // e.g. INQ-1001
  inquiryDate: string; // YYYY-MM-DD
  customerName: string;
  mobileNumber: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  eventType: string;
  eventDate: string; // YYYY-MM-DD
  venue?: string;
  source: InquirySource;
  budget?: number;
  notes?: string;
  status: InquiryStatus;
  followUpDate?: string; // YYYY-MM-DD
  followUpNotes?: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

export interface QuotationItem {
  id: string;
  serviceName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  gstPercent: number;
  total: number;
}

export type QuotationStatus = 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'expired' | 'converted_to_booking';

export interface QuotationFollowUp {
  id: string;
  followUpDate: string; // YYYY-MM-DD
  status: 'waiting_for_response' | 'followed_up' | 'rescheduled' | 'closed';
  notes: string;
  reminder: boolean;
  createdAt: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string; // e.g. QUO-1001
  inquiryId?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  whatsappNumber?: string;
  customerEmail?: string;
  customerAddress?: string;
  eventType: string;
  eventDate: string; // YYYY-MM-DD
  eventVenue?: string;
  items: QuotationItem[];
  subTotal: number;
  totalDiscount: number;
  totalGst: number;
  grandTotal: number;
  termsAndConditions?: string;
  validUntilDate: string; // YYYY-MM-DD
  status: QuotationStatus;
  followUps?: QuotationFollowUp[];
  convertedBookingId?: string;
  digitalSignatureUrl?: string;
  watermarkText?: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

export interface PaymentRecord {
  id: string;
  bookingId: string;
  invoiceId?: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentType: 'advance' | 'partial' | 'full';
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  paymentDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string; // ISO String
}

export interface WorkOrder {
  id: string;
  orderNumber: string; // e.g. WO-1001
  bookingId: string;
  quotationId?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  eventType: string;
  eventDate: string; // YYYY-MM-DD
  venue?: string;
  items: QuotationItem[];
  assignment?: TeamAssignment;
  progress: OrderProgress;
  status: 'scheduled' | 'in_production' | 'completed' | 'delivered';
  deliveryDate?: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

export interface AttendanceRecord {
  id: string;
  employeeId: string; // Internal or Custom ID
  employeeName: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string;
  checkOutTime?: string;
  workingHours?: number;
  status: 'Present' | 'Absent' | 'Late' | 'On Leave' | 'Half Day';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department?: string;
  designation?: string;
  month: string; // YYYY-MM
  basicSalary: number;
  bonus: number;
  incentive: number;
  deduction: number;
  advanceSalary: number;
  netSalary: number;
  paymentStatus: 'Paid' | 'Pending' | 'Partial';
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: 'Casual Leave' | 'Sick Leave' | 'Paid Leave' | 'Emergency Leave';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  appliedOn: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeJobAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  category: 'Photography Booking' | 'Printing Order' | 'Designing Work' | 'Delivery Work';
  relatedId?: string; // booking or order ID
  assignedDate?: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Working' | 'Completed';
  notes?: string;
  rating?: number; // 1 to 5
  createdAt: string;
  updatedAt: string;
}

// Studio Service Management Types
export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  createdAt: string;
}

export interface ServiceVariant {
  id: string;
  variantName: string; // e.g. Basic, Standard, Premium, Luxury
  price: number;
  features: string[];
  duration?: string;
  numberOfPhotographers?: number;
  numberOfCameras?: number;
}

export interface StudioService {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  shortDescription: string;
  fullDescription?: string;
  thumbnailImage?: string;
  photos?: string[];
  basePrice: number;
  discount: number;
  gst: number; // e.g. 0, 5, 12, 18
  unit: string; // 'Per Day' | 'Per Hour' | 'Per Event' | 'Per Piece' | 'Session' | 'Units' | 'Projects'
  minQuantity: number;
  maxQuantity?: number;
  isAvailable: boolean;
  isFeatured: boolean;
  popularBadge: boolean;
  serviceColor?: string;
  icon?: string;
  displayOrder: number;
  status: 'active' | 'archived';
  variants?: ServiceVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface StudioPackageItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  variantName?: string;
  unitPrice?: number;
}

export interface StudioPackage {
  id: string;
  packageName: string;
  includedServices: StudioPackageItem[];
  packagePrice: number;
  discount: number;
  coverPhoto?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

